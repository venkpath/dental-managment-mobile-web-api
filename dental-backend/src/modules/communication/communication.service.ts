import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { paginate } from '../../common/interfaces/paginated-result.interface.js';
import { TemplateService } from './template.service.js';
import { TemplateRenderer } from './template-renderer.js';
import { CommunicationProducer } from './communication.producer.js';
import { EmailProvider } from './providers/email.provider.js';
import { SmsProvider } from './providers/sms.provider.js';
import { WhatsAppProvider } from './providers/whatsapp.provider.js';
import type { EmailProviderConfig } from './providers/email.provider.js';
import type { SmsProviderConfig } from './providers/sms.provider.js';
import type { WhatsAppProviderConfig } from './providers/whatsapp.provider.js';
import type { SendMessageDto } from './dto/send-message.dto.js';
import type { QueryMessageDto } from './dto/query-message.dto.js';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import type { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto.js';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  /** Per-clinic configuration lock to prevent race conditions */
  private readonly configurationLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly templateService: TemplateService,
    private readonly renderer: TemplateRenderer,
    private readonly producer: CommunicationProducer,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly whatsAppProvider: WhatsAppProvider,
  ) {}

  // ─── Send Message ───

  async sendMessage(clinicId: string, dto: SendMessageDto) {
    // Ensure providers are configured for this clinic (race-safe)
    await this.ensureProvidersConfigured(clinicId);

    // 1. Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patient_id, clinic_id: clinicId },
      include: { communication_preference: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${dto.patient_id}" not found`);
    }

    // 2. Check clinic communication settings
    const clinicSettings = await this.getOrCreateClinicSettings(clinicId);
    const channelEnabled = this.isChannelEnabled(clinicSettings, dto.channel);

    if (!channelEnabled) {
      return this.createSkippedMessage(clinicId, dto, patient, 'channel_disabled_clinic');
    }

    // 3. Check patient preferences
    const skipReason = this.checkPatientPreferences(
      patient.communication_preference,
      dto.channel,
      dto.category || 'transactional',
    );

    if (skipReason) {
      return this.createSkippedMessage(clinicId, dto, patient, skipReason);
    }

    // 4. Check DND / quiet hours for promotional messages
    if (dto.category === 'promotional') {
      const dndSkip = this.checkDndHours(patient.communication_preference, clinicSettings);
      if (dndSkip) {
        // Schedule for next valid window instead of skipping
        const nextWindow = this.getNextValidWindow(patient.communication_preference, clinicSettings);
        dto.scheduled_at = nextWindow.toISOString();
        this.logger.log(`Promotional message delayed to ${nextWindow} due to DND hours`);
      }
    }

    // 4.5 Circuit breaker — pause channel if failure rate is too high
    const circuitOpen = await this.isCircuitOpen(clinicId, dto.channel);
    if (circuitOpen) {
      return this.createSkippedMessage(clinicId, dto, patient, 'circuit_breaker_open');
    }

    // 4.6 Check daily rate limit
    if (clinicSettings.daily_message_limit && clinicSettings.daily_message_limit > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayCount = await this.prisma.communicationMessage.count({
        where: {
          clinic_id: clinicId,
          created_at: { gte: startOfDay },
          status: { notIn: ['skipped'] },
        },
      });
      if (todayCount >= clinicSettings.daily_message_limit) {
        return this.createSkippedMessage(clinicId, dto, patient, 'daily_limit_exceeded');
      }
    }

    // 5. Resolve message body (from template or direct)
    let body = dto.body || '';
    let subject = dto.subject;
    let html: string | undefined;

    let dltTemplateId: string | undefined;

    // Build enriched variables with common aliases so any template resolves cleanly.
    // e.g. automation sends patient_first_name → also available as {{name}}.
    const vars: Record<string, string> = { ...(dto.variables || {}) };
    if (!vars['name']) vars['name'] = vars['patient_first_name'] || vars['patient_name'] || '';
    if (!vars['code']) vars['code'] = vars['otp_code'] || '';

    if (dto.template_id) {
      const template = await this.templateService.findOne(clinicId, dto.template_id);
      body = this.renderer.render(template.body, vars);
      subject = subject || (template.subject ? this.renderer.render(template.subject, vars) : undefined);
      dltTemplateId = template.dlt_template_id ?? undefined;
    }

    // SMS DLT compliance: when no template is linked, auto-resolve from env default.
    // This finds the DB template matching the default DLT ID and uses its body,
    // ensuring the SMS body always matches the registered DLT pattern.
    // → Test with 1 template: set SMS_DEFAULT_DLT_TEMPLATE_ID in env, all SMS works.
    // → Add more templates later: set dlt_template_id on each DB template, they take priority.
    if (dto.channel === 'sms' && !dltTemplateId) {
      const defaultDltId = this.configService.get<string>('app.sms.defaultDltTemplateId');
      if (defaultDltId) {
        dltTemplateId = defaultDltId;

        // Find the DB template with this DLT ID and render its body
        const fallbackTemplate = await this.prisma.messageTemplate.findFirst({
          where: { dlt_template_id: defaultDltId, is_active: true, channel: { in: ['sms', 'all'] } },
        });

        if (fallbackTemplate) {
          body = this.renderer.render(fallbackTemplate.body, vars);
        }
      }
    }

    if (!body) {
      throw new BadRequestException('Message body is required — provide body or template_id');
    }

    // 5.5 Auto-append opt-out link for promotional messages
    if (dto.category === 'promotional' && dto.channel !== 'in_app') {
      const optOutUrl = this.generateOptOutUrl(dto.patient_id);
      if (dto.channel === 'email') {
        body += `\n\nDon't want to receive these emails? Unsubscribe: ${optOutUrl}`;
      } else {
        body += `\nOpt-out: ${optOutUrl}`;
      }
    }

    // 6. Sanitize rendered content for the target channel
    if (dto.channel === 'email') {
      html = this.renderEmailHtml(body, subject, clinicId);
    } else {
      // Sanitize SMS/WhatsApp body to prevent injection of control characters
      body = this.sanitizeTextBody(body);
    }

    // 7. Deduplication check
    const isDuplicate = await this.checkDeduplication(
      dto.patient_id,
      dto.template_id || null,
      dto.channel,
    );

    if (isDuplicate) {
      return this.createSkippedMessage(clinicId, dto, patient, 'dedup_duplicate');
    }

    // 8. Determine recipient
    const recipient = this.getRecipient(patient, dto.channel);
    if (!recipient) {
      return this.createSkippedMessage(clinicId, dto, patient, 'no_recipient_info');
    }

    // 9. Create communication message record
    const message = await this.prisma.communicationMessage.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        template_id: dto.template_id,
        channel: dto.channel,
        category: dto.category || 'transactional',
        subject,
        body,
        recipient,
        status: dto.scheduled_at ? 'scheduled' : 'queued',
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
    });

    // 10. Queue for delivery
    await this.producer.enqueue({
      messageId: message.id,
      clinicId,
      channel: dto.channel,
      to: recipient,
      subject,
      body,
      html,
      templateId: dltTemplateId, // DLT template ID for SMS compliance
      metadata: dto.metadata,
      scheduledAt: dto.scheduled_at,
    });

    this.logger.debug(`Message ${message.id} queued via ${dto.channel} to ${recipient}`);
    return message;
  }

  // ─── Message Queries ───

  async findAllMessages(clinicId: string, query: QueryMessageDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CommunicationMessageWhereInput = { clinic_id: clinicId };

    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;
    if (query.patient_id) where.patient_id = query.patient_id;
    if (query.start_date || query.end_date) {
      where.created_at = {};
      if (query.start_date) where.created_at.gte = new Date(query.start_date);
      if (query.end_date) where.created_at.lte = new Date(query.end_date);
    }

    const [data, total] = await Promise.all([
      this.prisma.communicationMessage.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          patient: { select: { first_name: true, last_name: true, phone: true, email: true } },
          template: { select: { template_name: true, channel: true } },
          logs: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communicationMessage.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOneMessage(clinicId: string, id: string) {
    const message = await this.prisma.communicationMessage.findFirst({
      where: { id, clinic_id: clinicId },
      include: {
        patient: { select: { first_name: true, last_name: true, phone: true, email: true } },
        template: true,
        logs: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID "${id}" not found`);
    }

    return message;
  }

  /** Get all messages sent to a specific patient (timeline view) */
  async getPatientTimeline(
    clinicId: string,
    patientId: string,
    page = 1,
    limit = 20,
    channel?: string,
  ) {
    // Validate patient belongs to clinic
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId },
      select: { id: true, first_name: true, last_name: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    const where: Prisma.CommunicationMessageWhereInput = {
      clinic_id: clinicId,
      patient_id: patientId,
    };
    if (channel) where.channel = channel;

    const [data, total] = await Promise.all([
      this.prisma.communicationMessage.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          template: { select: { template_name: true, channel: true } },
          logs: { orderBy: { created_at: 'desc' }, take: 1 },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communicationMessage.count({ where }),
    ]);

    return {
      patient,
      ...paginate(data, total, page, limit),
    };
  }

  // ─── Communication Log ───

  async createLog(data: {
    message_id: string;
    channel: string;
    provider: string;
    provider_message_id?: string;
    status: string;
    error_message?: string;
    cost?: number;
  }) {
    const logData: Prisma.CommunicationLogCreateInput = {
      message: { connect: { id: data.message_id } },
      channel: data.channel,
      provider: data.provider,
      provider_message_id: data.provider_message_id,
      status: data.status,
      error_message: data.error_message,
      cost: data.cost,
    };

    if (data.status === 'sent') logData.sent_at = new Date();
    if (data.status === 'delivered') logData.delivered_at = new Date();
    if (data.status === 'read') logData.read_at = new Date();
    if (data.status === 'failed') logData.failed_at = new Date();

    return this.prisma.communicationLog.create({ data: logData });
  }

  async updateMessageStatus(messageId: string, status: string) {
    return this.prisma.communicationMessage.update({
      where: { id: messageId },
      data: {
        status,
        sent_at: status === 'sent' ? new Date() : undefined,
      },
    });
  }

  // ─── Patient Preferences ───

  async getPatientPreferences(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    let prefs = await this.prisma.patientCommunicationPreference.findUnique({
      where: { patient_id: patientId },
    });

    // Return defaults if no preferences set
    if (!prefs) {
      prefs = await this.prisma.patientCommunicationPreference.create({
        data: { patient_id: patientId },
      });
    }

    return prefs;
  }

  async updatePatientPreferences(
    clinicId: string,
    patientId: string,
    dto: UpdatePreferencesDto,
    changedBy: string = 'clinic_staff',
    ipAddress?: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    // Get current preferences for audit trail
    const current = await this.prisma.patientCommunicationPreference.findUnique({
      where: { patient_id: patientId },
    });

    // Upsert preferences
    const updated = await this.prisma.patientCommunicationPreference.upsert({
      where: { patient_id: patientId },
      create: { patient_id: patientId, ...dto },
      update: dto,
    });

    // Create consent audit trail entries for each changed field
    if (current) {
      const auditEntries: Prisma.ConsentAuditLogCreateManyInput[] = [];
      const fields = [
        'allow_email', 'allow_sms', 'allow_whatsapp',
        'allow_marketing', 'allow_reminders', 'preferred_channel',
        'quiet_hours_start', 'quiet_hours_end',
      ] as const;

      for (const field of fields) {
        if (dto[field] !== undefined && String(current[field]) !== String(dto[field])) {
          auditEntries.push({
            patient_id: patientId,
            field_changed: field,
            old_value: String(current[field] ?? ''),
            new_value: String(dto[field]),
            changed_by: changedBy,
            source: 'settings_page',
            ip_address: ipAddress,
          });
        }
      }

      if (auditEntries.length > 0) {
        await this.prisma.consentAuditLog.createMany({ data: auditEntries });
      }
    }

    return updated;
  }

  // ─── Self-Service Opt-Out ───

  /** Generate signed opt-out token for a patient (HMAC-SHA256) */
  generateOptOutToken(patientId: string): string {
    const secret = this.configService.get<string>('app.jwtSecret') || 'fallback-secret';
    const payload = Buffer.from(JSON.stringify({ pid: patientId, ts: Date.now() })).toString('base64url');
    const sig = createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  /** Generate a full opt-out URL for inclusion in messages */
  generateOptOutUrl(patientId: string): string {
    const token = this.generateOptOutToken(patientId);
    const baseUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';
    return `${baseUrl}/unsubscribe?token=${token}`;
  }

  /** Verify opt-out token and return patient ID */
  verifyOptOutToken(token: string): { patientId: string } | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payload, sig] = parts;
    const secret = this.configService.get<string>('app.jwtSecret') || 'fallback-secret';
    const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');

    // Constant-time comparison
    if (sig.length !== expectedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (diff !== 0) return null;

    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      // Token expires after 90 days
      if (Date.now() - data.ts > 90 * 24 * 60 * 60 * 1000) return null;
      return { patientId: data.pid };
    } catch {
      return null;
    }
  }

  /** Process opt-out request — disable marketing communications for the patient */
  async processOptOut(token: string, channels?: string[], ipAddress?: string) {
    const verified = this.verifyOptOutToken(token);
    if (!verified) {
      throw new BadRequestException('Invalid or expired unsubscribe link');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: verified.patientId },
      select: { id: true, first_name: true, clinic_id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Default: disable all marketing. If specific channels provided, disable only those
    const updateData: Record<string, boolean> = {};
    if (!channels || channels.length === 0) {
      updateData.allow_marketing = false;
    } else {
      if (channels.includes('email')) updateData.allow_email = false;
      if (channels.includes('sms')) updateData.allow_sms = false;
      if (channels.includes('whatsapp')) updateData.allow_whatsapp = false;
    }

    const prefs = await this.prisma.patientCommunicationPreference.upsert({
      where: { patient_id: patient.id },
      create: { patient_id: patient.id, ...updateData },
      update: updateData,
    });

    // Consent audit trail
    const auditEntries: Prisma.ConsentAuditLogCreateManyInput[] = Object.entries(updateData).map(
      ([field, value]) => ({
        patient_id: patient.id,
        field_changed: field,
        old_value: 'true',
        new_value: String(value),
        changed_by: 'patient_self_service',
        source: 'opt_out_link',
        ip_address: ipAddress,
      }),
    );

    if (auditEntries.length > 0) {
      await this.prisma.consentAuditLog.createMany({ data: auditEntries });
    }

    return {
      message: 'Your communication preferences have been updated',
      patient_name: patient.first_name,
      preferences: prefs,
    };
  }

  // ─── Clinic Settings ───

  async getClinicSettings(clinicId: string) {
    const [settings, canCustomize] = await Promise.all([
      this.getOrCreateClinicSettings(clinicId),
      this.hasClinicFeature(clinicId, 'CUSTOM_PROVIDER_CONFIG'),
    ]);

    return { ...settings, can_customize_providers: canCustomize };
  }

  async updateClinicSettings(clinicId: string, dto: UpdateClinicSettingsDto, options?: { skipFeatureCheck?: boolean }) {
    // Check if clinic can customize provider configs (super admin bypasses this)
    if (!options?.skipFeatureCheck) {
      const canCustomize = await this.hasClinicFeature(clinicId, 'CUSTOM_PROVIDER_CONFIG');

      if (!canCustomize && (dto.email_config || dto.sms_config || dto.whatsapp_config)) {
        throw new ForbiddenException(
          'Custom provider configuration is available on Professional and Enterprise plans. ' +
          'Your clinic currently uses the platform default settings.',
        );
      }
    }

    const data = {
      ...dto,
      email_config: dto.email_config ? JSON.parse(JSON.stringify(dto.email_config)) : undefined,
      sms_config: dto.sms_config ? JSON.parse(JSON.stringify(dto.sms_config)) : undefined,
      whatsapp_config: dto.whatsapp_config ? JSON.parse(JSON.stringify(dto.whatsapp_config)) : undefined,
      fallback_chain: dto.fallback_chain ? JSON.parse(JSON.stringify(dto.fallback_chain)) : undefined,
      default_reminder_channels: dto.default_reminder_channels ? JSON.parse(JSON.stringify(dto.default_reminder_channels)) : undefined,
    };

    // Auto-set provider names when config is provided but provider name is missing
    if (data.email_config && !dto.email_provider) {
      data.email_provider = 'smtp';
    }
    if (data.sms_config && !dto.sms_provider) {
      data.sms_provider = 'msg91';
    }
    if (data.whatsapp_config && !dto.whatsapp_provider) {
      data.whatsapp_provider = 'gupshup';
    }

    const settings = await this.prisma.clinicCommunicationSettings.upsert({
      where: { clinic_id: clinicId },
      create: { clinic_id: clinicId, ...data },
      update: data,
    });

    // Re-configure providers with new settings (invalidate cache)
    this.configureProviders(clinicId, settings);

    return settings;
  }

  // ─── Analytics ───

  async getMessageStats(clinicId: string, startDate?: string, endDate?: string) {
    const where: Prisma.CommunicationMessageWhereInput = { clinic_id: clinicId };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const [total, byChannel, byStatus, byCategory] = await Promise.all([
      this.prisma.communicationMessage.count({ where }),
      this.prisma.communicationMessage.groupBy({
        by: ['channel'],
        where,
        _count: true,
      }),
      this.prisma.communicationMessage.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.communicationMessage.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
    ]);

    // Delivery metrics
    const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    const sent = (statusMap['sent'] || 0) + (statusMap['delivered'] || 0);
    const delivered = statusMap['delivered'] || 0;
    const failed = statusMap['failed'] || 0;
    const skipped = statusMap['skipped'] || 0;

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0;
    const failureRate = (sent + failed) > 0 ? Math.round((failed / (sent + failed)) * 1000) / 10 : 0;

    // Daily volume trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyTrend = await this.prisma.$queryRaw<
      { date: string; count: number; delivered: number; failed: number }[]
    >`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
      FROM communication_messages
      WHERE clinic_id = ${clinicId}::uuid
        AND created_at >= ${thirtyDaysAgo}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    return {
      total,
      delivery_rate: deliveryRate,
      failure_rate: failureRate,
      by_channel: byChannel.map((c) => ({ channel: c.channel, count: c._count })),
      by_status: byStatus.map((s) => ({ status: s.status, count: s._count })),
      by_category: byCategory.map((c) => ({ category: c.category, count: c._count })),
      metrics: { sent, delivered, failed, skipped },
      daily_trend: dailyTrend,
    };
  }

  // ─── Test Email ───

  async sendTestEmail(clinicId: string, to: string) {
    // Ensure providers are configured (env fallback or clinic-level)
    await this.ensureProvidersConfigured(clinicId);

    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: clinicId },
    });

    if (settings && !settings.enable_email) {
      throw new BadRequestException('Email is not enabled. Go to Communication → Settings and enable email first.');
    }

    // Check if email provider is configured (either from clinic config or env)
    if (!this.emailProvider.isConfigured(clinicId)) {
      throw new BadRequestException('Email provider not configured. Set SMTP env vars or configure in Communication → Settings (Professional+ plans).');
    }

    // Verify SMTP connectivity before sending
    const verification = await this.emailProvider.verify(clinicId);
    if (!verification.ok) {
      throw new BadRequestException(`SMTP connection failed: ${verification.error}. Check host, port, and credentials in Communication → Settings.`);
    }

    const result = await this.emailProvider.send({
      to,
      subject: 'Dental Clinic — SMTP Test Email',
      body: 'This is a test email to verify your SMTP configuration is working correctly.',
      html: this.renderEmailHtml(
        'This is a test email to verify your SMTP configuration is working correctly.\n\nIf you received this, your email setup is working!',
        'Dental Clinic — SMTP Test Email',
        clinicId,
      ),
      clinicId,
    });

    if (!result.success) {
      throw new BadRequestException(`Email sending failed: ${result.error}`);
    }

    return {
      message: 'Test email sent successfully',
      to,
      provider_message_id: result.providerMessageId,
    };
  }

  // ─── Test SMS ───

  async sendTestSms(
    clinicId: string,
    to: string,
    dltTemplateId?: string,
    variables?: Record<string, string>,
  ) {
    await this.ensureProvidersConfigured(clinicId);

    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: clinicId },
    });

    if (settings && !settings.enable_sms) {
      throw new BadRequestException('SMS is not enabled. Go to Communication → Settings and enable SMS first.');
    }

    if (!this.smsProvider.isConfigured(clinicId)) {
      throw new BadRequestException('SMS provider not configured. Set SMS env vars or configure in Communication → Settings (Professional+ plans).');
    }

    // Resolve DLT template ID: explicit param → env default
    const templateId = dltTemplateId
      || this.configService.get<string>('app.sms.defaultDltTemplateId')
      || undefined;

    if (!templateId) {
      throw new BadRequestException(
        'DLT template ID is required. Provide dlt_template_id in the request or set SMS_DEFAULT_DLT_TEMPLATE_ID env var.',
      );
    }

    // Resolve body: use env-configured DLT template body, fill {#var#} with provided variables
    const envBody = this.configService.get<string>('app.sms.dltTemplateBody') || '';
    let testBody = envBody;
    const varValues = Object.values(variables || {});
    for (const val of varValues) {
      testBody = testBody.replace('{#var#}', val);
    }
    // Replace any remaining {#var#} with 'test'
    testBody = testBody.replace(/\{#var#\}/g, 'test');

    if (!testBody) {
      throw new BadRequestException('SMS template body is empty. Set SMS_DLT_TEMPLATE_BODY env var.');
    }

    const result = await this.smsProvider.send({
      to,
      body: testBody,
      templateId,
      clinicId,
    });

    if (!result.success) {
      throw new BadRequestException(`SMS sending failed: ${result.error}`);
    }

    return {
      message: 'Test SMS sent successfully',
      to,
      dlt_template_id: templateId,
      body_sent: testBody,
      provider_message_id: result.providerMessageId,
    };
  }

  async verifySmtp(clinicId: string) {
    await this.ensureProvidersConfigured(clinicId);

    if (!this.emailProvider.isConfigured(clinicId)) {
      return { ok: false, error: 'Email not configured. Set SMTP env vars or configure in Communication → Settings (Professional+ plans).' };
    }

    const result = await this.emailProvider.verify(clinicId);
    return result;
  }

  // ─── Channel Fallback ───

  /**
   * Called by workers when a message fails after all retries.
   * Checks the clinic's fallback_chain and re-queues to the next channel.
   */
  async handleChannelFallback(messageId: string, failedChannel: string): Promise<boolean> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: messageId },
    });
    if (!message || !message.patient_id) return false;

    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: message.clinic_id },
    });
    if (!settings?.fallback_chain) return false;

    const chain = settings.fallback_chain as string[];
    const currentIndex = chain.indexOf(failedChannel);
    if (currentIndex === -1 || currentIndex >= chain.length - 1) return false;

    const nextChannel = chain[currentIndex + 1];

    // Check if the next channel is enabled
    if (!this.isChannelEnabled(settings, nextChannel)) return false;

    // Get patient for recipient resolution
    const patient = await this.prisma.patient.findUnique({
      where: { id: message.patient_id },
      select: { phone: true, email: true },
    });
    if (!patient) return false;

    const recipient = this.getRecipient(patient, nextChannel);
    if (!recipient) return false;

    await this.prisma.communicationMessage.update({
      where: { id: messageId },
      data: { channel: nextChannel, recipient, status: 'queued' },
    });

    // Re-queue to the fallback channel
    await this.producer.enqueue({
      messageId,
      clinicId: message.clinic_id,
      channel: nextChannel,
      to: recipient,
      subject: message.subject ?? undefined,
      body: message.body,
      metadata: (message.metadata as Record<string, unknown>) ?? undefined,
    });

    this.logger.log(`Fallback: ${messageId} ${failedChannel} → ${nextChannel}`);
    return true;
  }

  // ─── Private Helpers ───

  private async getOrCreateClinicSettings(clinicId: string) {
    let settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: clinicId },
    });

    if (!settings) {
      settings = await this.prisma.clinicCommunicationSettings.create({
        data: { clinic_id: clinicId },
      });
    }

    return settings;
  }

  private isChannelEnabled(
    settings: { enable_email: boolean; enable_sms: boolean; enable_whatsapp: boolean },
    channel: string,
  ): boolean {
    switch (channel) {
      case 'email': return settings.enable_email;
      case 'sms': return settings.enable_sms;
      case 'whatsapp': return settings.enable_whatsapp;
      case 'in_app': return true; // in-app always enabled
      default: return false;
    }
  }

  private checkPatientPreferences(
    prefs: { allow_email: boolean; allow_sms: boolean; allow_whatsapp: boolean; allow_marketing: boolean; allow_reminders: boolean } | null,
    channel: string,
    category: string,
  ): string | null {
    if (!prefs) return null; // no preferences = allow all

    // Check channel preference
    switch (channel) {
      case 'email': if (!prefs.allow_email) return 'patient_email_disabled'; break;
      case 'sms': if (!prefs.allow_sms) return 'patient_sms_disabled'; break;
      case 'whatsapp': if (!prefs.allow_whatsapp) return 'patient_whatsapp_disabled'; break;
    }

    // Check category preference
    if (category === 'promotional' && !prefs.allow_marketing) {
      return 'patient_marketing_disabled';
    }
    if (category === 'transactional' && !prefs.allow_reminders) {
      return 'patient_reminders_disabled';
    }

    return null;
  }

  /**
   * Check if current time falls within DND quiet hours.
   * Uses clinic DND settings as fallback, and TRAI default (21:00-09:00) as last resort.
   * Computes time in Asia/Kolkata timezone for Indian clinics.
   */
  private checkDndHours(
    prefs: { quiet_hours_start: string | null; quiet_hours_end: string | null } | null,
    clinicSettings?: { dnd_start: string | null; dnd_end: string | null },
  ): boolean {
    // Priority: patient prefs → clinic settings → TRAI default
    const start = prefs?.quiet_hours_start || clinicSettings?.dnd_start || '21:00';
    const end = prefs?.quiet_hours_end || clinicSettings?.dnd_end || '09:00';

    // Use IST (Asia/Kolkata) for Indian regulatory compliance
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    // Handle overnight quiet hours (e.g., 21:00 - 09:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  private getNextValidWindow(
    prefs: { quiet_hours_end: string | null } | null,
    clinicSettings?: { dnd_end: string | null },
  ): Date {
    const endTime = prefs?.quiet_hours_end || clinicSettings?.dnd_end || '09:00';
    const [hours, minutes] = endTime.split(':').map(Number);

    // Compute next valid window in IST
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const next = new Date(nowIST);
    next.setHours(hours, minutes, 0, 0);

    // If the window end is already past today, schedule for tomorrow
    if (next <= nowIST) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  private async checkDeduplication(
    patientId: string,
    templateId: string | null,
    channel: string,
  ): Promise<boolean> {
    if (!templateId) return false; // no dedup for ad-hoc messages

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existing = await this.prisma.communicationMessage.findFirst({
      where: {
        patient_id: patientId,
        template_id: templateId,
        channel,
        status: { not: 'skipped' },
        created_at: { gte: twentyFourHoursAgo },
      },
    });

    return !!existing;
  }

  private getRecipient(
    patient: { phone: string; email: string | null },
    channel: string,
  ): string | null {
    switch (channel) {
      case 'email': return patient.email;
      case 'sms':
      case 'whatsapp': return patient.phone;
      case 'in_app': return patient.phone; // use phone as identifier
      default: return null;
    }
  }

  private async createSkippedMessage(
    clinicId: string,
    dto: SendMessageDto,
    patient: { phone: string; email: string | null; first_name?: string; last_name?: string },
    reason: string,
  ) {
    this.logger.debug(`Message skipped for patient ${dto.patient_id}: ${reason}`);

    let body = dto.body || '';
    let subject = dto.subject || '';

    // Skipped messages should still carry the rendered content for audit/debug UI.
    if (!body && dto.template_id) {
      try {
        const vars: Record<string, string> = {
          ...(dto.variables || {}),
          patient_name:
            dto.variables?.['patient_name'] ||
            `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
          patient_first_name: dto.variables?.['patient_first_name'] || patient.first_name || '',
          patient_last_name: dto.variables?.['patient_last_name'] || patient.last_name || '',
        };
        if (!vars['name']) vars['name'] = vars['patient_first_name'] || vars['patient_name'] || '';

        const template = await this.templateService.findOne(clinicId, dto.template_id);
        body = this.renderer.render(template.body, vars);
        subject = dto.subject || (template.subject ? this.renderer.render(template.subject, vars) : '') || '';
      } catch (error) {
        this.logger.warn(
          `Failed to render skipped message body for template ${dto.template_id}: ${(error as Error).message}`,
        );
      }
    }

    return this.prisma.communicationMessage.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        template_id: dto.template_id,
        channel: dto.channel,
        category: dto.category || 'transactional',
        subject,
        body,
        recipient: this.getRecipient(patient, dto.channel) || '',
        status: 'skipped',
        skip_reason: reason,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
    });
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  // ─── Provider Configuration (race-safe, per-clinic) ───

  /**
   * Ensure providers are configured for a clinic. Uses a per-clinic lock
   * to prevent race conditions where concurrent requests trigger duplicate
   * DB reads and configuration.
   */
  private async ensureProvidersConfigured(clinicId: string): Promise<void> {
    // Fast path: already configured
    if (this.emailProvider.isConfigured(clinicId) ||
        this.smsProvider.isConfigured(clinicId) ||
        this.whatsAppProvider.isConfigured(clinicId)) {
      return;
    }

    // Check if there's already a pending configuration for this clinic
    const existingLock = this.configurationLocks.get(clinicId);
    if (existingLock) {
      await existingLock;
      return;
    }

    // Create a lock promise for this clinic
    const configPromise = this.loadAndConfigureProviders(clinicId);
    this.configurationLocks.set(clinicId, configPromise);

    try {
      await configPromise;
    } finally {
      this.configurationLocks.delete(clinicId);
    }
  }

  private async loadAndConfigureProviders(clinicId: string): Promise<void> {
    const [settings, canCustomize] = await Promise.all([
      this.prisma.clinicCommunicationSettings.findUnique({
        where: { clinic_id: clinicId },
      }),
      this.hasClinicFeature(clinicId, 'CUSTOM_PROVIDER_CONFIG'),
    ]);

    // Only apply clinic-level provider configs if the plan supports customization
    if (settings && canCustomize) {
      this.configureProviders(clinicId, settings);
    }

    // Fallback: configure email from env vars if not already configured
    if (!this.emailProvider.isConfigured(clinicId)) {
      const envHost = this.configService.get<string>('app.smtp.host');
      const envUser = this.configService.get<string>('app.smtp.user');
      if (envHost && envUser) {
        this.emailProvider.configure(clinicId, {
          host: envHost,
          port: this.configService.get<number>('app.smtp.port') || 587,
          secure: this.configService.get<boolean>('app.smtp.secure') || false,
          user: envUser,
          pass: this.configService.get<string>('app.smtp.pass') || '',
          from: this.configService.get<string>('app.smtp.from'),
        }, 'smtp');
        this.logger.log(`Email provider configured from env vars for clinic ${clinicId}`);
      }
    }

    // Fallback: configure SMS from env vars if not already configured
    if (!this.smsProvider.isConfigured(clinicId)) {
      const envApiKey = this.configService.get<string>('app.sms.apiKey');
      const envSenderId = this.configService.get<string>('app.sms.senderId');
      if (envApiKey && envSenderId) {
        this.smsProvider.configure(clinicId, {
          apiKey: envApiKey,
          senderId: envSenderId,
          dltEntityId: this.configService.get<string>('app.sms.entityId'),
          route: 'transactional',
        }, 'msg91');
        this.logger.log(`SMS provider configured from env vars for clinic ${clinicId}`);
      }
    }
  }

  private configureProviders(clinicId: string, settings: {
    enable_email: boolean;
    email_provider: string | null;
    email_config: unknown;
    enable_sms: boolean;
    sms_provider: string | null;
    sms_config: unknown;
    enable_whatsapp: boolean;
    whatsapp_provider: string | null;
    whatsapp_config: unknown;
  }): void {
    // Configure email provider
    if (settings.enable_email && settings.email_config && settings.email_provider) {
      const raw = settings.email_config as Record<string, unknown>;
      // Normalise: frontend may store smtp_host/smtp_port/… while provider expects host/port/…
      const emailConfig: EmailProviderConfig = {
        host: (raw.host ?? raw.smtp_host) as string,
        port: Number(raw.port ?? raw.smtp_port),
        secure: raw.secure as boolean | undefined,
        user: (raw.user ?? raw.smtp_user) as string,
        pass: (raw.pass ?? raw.smtp_pass) as string,
        from: (raw.from ?? raw.from_email) as string | undefined,
      };
      this.emailProvider.configure(clinicId, emailConfig, settings.email_provider);
      this.logger.log(`Email provider configured for clinic ${clinicId}: ${settings.email_provider}`);
    }

    // Configure SMS provider
    if (settings.enable_sms && settings.sms_config && settings.sms_provider) {
      const raw = settings.sms_config as Record<string, unknown>;
      // Normalise: frontend stores api_key/sender_id (snake), provider expects camelCase
      const smsConfig: SmsProviderConfig = {
        apiKey: (raw.apiKey ?? raw.api_key) as string,
        senderId: (raw.senderId ?? raw.sender_id) as string,
        dltEntityId: (raw.dltEntityId ?? raw.dlt_entity_id) as string | undefined,
        route: (raw.route as 'transactional' | 'promotional' | undefined) ?? 'transactional',
      };
      this.smsProvider.configure(clinicId, smsConfig, settings.sms_provider);
      this.logger.log(`SMS provider configured for clinic ${clinicId}: ${settings.sms_provider}`);
    }

    // Configure WhatsApp provider
    if (settings.enable_whatsapp && settings.whatsapp_config && settings.whatsapp_provider) {
      const waConfig = settings.whatsapp_config as WhatsAppProviderConfig;
      this.whatsAppProvider.configure(clinicId, waConfig, settings.whatsapp_provider);
      this.logger.log(`WhatsApp provider configured for clinic ${clinicId}: ${settings.whatsapp_provider}`);
    }
  }

  // ─── Text Sanitization ───

  /**
   * Sanitize SMS/WhatsApp message body to prevent injection of:
   * - Invisible Unicode characters (zero-width joiners, RTL marks, etc.)
   * - Control characters that could manipulate message display
   */
  private sanitizeTextBody(body: string): string {
    return body
      // Remove zero-width characters
      .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
      // Remove other control characters (except newlines and tabs)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }

  // ─── HTML Email Rendering ───

  private renderEmailHtml(body: string, subject?: string, _clinicId?: string): string {
    // Convert plain text body to styled HTML email
    const paragraphs = body
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${this.escapeHtml(line)}</p>`)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background: linear-gradient(135deg, #0d9488, #0891b2); padding: 24px 32px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${this.escapeHtml(subject || 'Notification')}</h1>
        </td></tr>
        <tr><td style="padding: 32px; color: #374151; font-size: 15px;">
          ${paragraphs}
        </td></tr>
        <tr><td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            Sent by DentalCare Platform &bull; This is an automated message
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Circuit Breaker ───

  private static readonly CIRCUIT_BREAKER_WINDOW = 100; // last N messages to check
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 0.2; // 20% failure rate

  /** Get circuit breaker status for all channels in a clinic */
  async getCircuitBreakerStatus(clinicId: string) {
    const channels = ['email', 'sms', 'whatsapp'];
    const result: Record<string, { is_open: boolean; failure_rate: number; sample_size: number }> = {};

    for (const channel of channels) {
      const recentMessages = await this.prisma.communicationMessage.findMany({
        where: {
          clinic_id: clinicId,
          channel,
          status: { in: ['sent', 'delivered', 'failed'] },
        },
        orderBy: { created_at: 'desc' },
        take: CommunicationService.CIRCUIT_BREAKER_WINDOW,
        select: { status: true },
      });

      const failedCount = recentMessages.filter((m) => m.status === 'failed').length;
      const failureRate = recentMessages.length > 0 ? failedCount / recentMessages.length : 0;

      result[channel] = {
        is_open: recentMessages.length >= 10 && failureRate >= CommunicationService.CIRCUIT_BREAKER_THRESHOLD,
        failure_rate: Math.round(failureRate * 1000) / 10, // percentage with 1 decimal
        sample_size: recentMessages.length,
      };
    }

    return result;
  }

  /**
   * Check if the circuit breaker is open for a clinic + channel.
   * Looks at the last 100 messages — if >20% failed, the channel is paused.
   */
  private async isCircuitOpen(clinicId: string, channel: string): Promise<boolean> {
    const recentMessages = await this.prisma.communicationMessage.findMany({
      where: {
        clinic_id: clinicId,
        channel,
        status: { in: ['sent', 'delivered', 'failed'] },
      },
      orderBy: { created_at: 'desc' },
      take: CommunicationService.CIRCUIT_BREAKER_WINDOW,
      select: { status: true },
    });

    // Not enough data to trip the breaker
    if (recentMessages.length < 10) return false;

    const failedCount = recentMessages.filter((m) => m.status === 'failed').length;
    const failureRate = failedCount / recentMessages.length;

    if (failureRate >= CommunicationService.CIRCUIT_BREAKER_THRESHOLD) {
      this.logger.warn(
        `Circuit breaker OPEN for clinic ${clinicId} channel ${channel}: ` +
        `${failedCount}/${recentMessages.length} failed (${(failureRate * 100).toFixed(1)}%)`,
      );
      return true;
    }

    return false;
  }

  // ─── Feature Check ───

  /**
   * Check if the clinic's plan has a specific feature enabled.
   */
  private async hasClinicFeature(clinicId: string, featureKey: string): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { plan_id: true },
    });

    if (!clinic?.plan_id) return false;

    const planFeature = await this.prisma.planFeature.findFirst({
      where: {
        plan_id: clinic.plan_id,
        feature: { key: featureKey },
        is_enabled: true,
      },
    });

    return !!planFeature;
  }

  // ─── SMS Delivery Webhook (MSG91 DLR) ───

  /**
   * Process MSG91 delivery report webhook.
   * MSG91 posts delivery updates to this endpoint with:
   *   { request_id, user_pid, report: [{ number, status }] }
   * or individual: { request_id, status, number, desc }
   */
  async handleSmsDeliveryWebhook(payload: Record<string, unknown>) {
    const requestId = payload['request_id'] as string;
    if (!requestId) {
      this.logger.warn('SMS webhook: missing request_id');
      return { processed: 0 };
    }

    // Map MSG91 status codes to our internal status
    const statusMap: Record<string, string> = {
      '1': 'delivered', // Delivered
      '2': 'failed',    // Failed
      '3': 'delivered', // Delivered to handset
      '5': 'sent',      // Pending / Submitted
      '9': 'failed',    // NDNC number
      '16': 'failed',   // Rejected by network
      '17': 'failed',   // Blocked number
      '25': 'sent',     // Operator accepted
      '26': 'failed',   // Duplicate
      delivered: 'delivered',
      failed: 'failed',
      sent: 'sent',
      bounced: 'failed',
    };

    let processed = 0;

    // Find the communication log(s) matching this request_id
    const logs = await this.prisma.communicationLog.findMany({
      where: { provider_message_id: requestId },
      include: { message: { select: { id: true, clinic_id: true } } },
    });

    if (logs.length === 0) {
      this.logger.debug(`SMS webhook: no matching log for request_id ${requestId}`);
      return { processed: 0 };
    }

    const reportStatus = String(payload['status'] || payload['report_status'] || '');
    const internalStatus = statusMap[reportStatus] || 'sent';

    for (const log of logs) {
      // Update the log entry
      const updateData: Record<string, unknown> = { status: internalStatus };
      if (internalStatus === 'delivered') updateData['delivered_at'] = new Date();
      if (internalStatus === 'failed') {
        updateData['failed_at'] = new Date();
        updateData['error_message'] = (payload['desc'] || payload['description'] || 'Delivery failed') as string;
      }

      await this.prisma.communicationLog.update({
        where: { id: log.id },
        data: updateData,
      });

      // Update the parent message status
      await this.updateMessageStatus(log.message.id, internalStatus);
      processed++;
    }

    this.logger.log(`SMS webhook processed: request_id=${requestId}, status=${internalStatus}, count=${processed}`);
    return { processed, status: internalStatus };
  }

  // ─── WhatsApp Delivery Webhook (Gupshup) ───

  /**
   * Process Gupshup WhatsApp delivery/read receipts.
   * Gupshup posts: { type: 'message-event', payload: { id, type, destination, ... } }
   */
  async handleWhatsAppWebhook(payload: Record<string, unknown>) {
    const eventType = payload['type'] as string;

    // Handle delivery status events
    if (eventType === 'message-event') {
      const eventPayload = payload['payload'] as Record<string, unknown> | undefined;
      if (!eventPayload) return { processed: 0 };

      const providerMessageId = eventPayload['id'] as string;
      const statusType = eventPayload['type'] as string; // enqueued, sent, delivered, read, failed
      const destination = eventPayload['destination'] as string;

      if (!providerMessageId) return { processed: 0 };

      const statusMap: Record<string, string> = {
        enqueued: 'queued',
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        failed: 'failed',
      };

      const internalStatus = statusMap[statusType] || 'sent';

      const logs = await this.prisma.communicationLog.findMany({
        where: { provider_message_id: providerMessageId, channel: 'whatsapp' },
        include: { message: { select: { id: true } } },
      });

      let processed = 0;
      for (const log of logs) {
        const updateData: Record<string, unknown> = { status: internalStatus };
        if (internalStatus === 'delivered') updateData['delivered_at'] = new Date();
        if (internalStatus === 'read') updateData['read_at'] = new Date();
        if (internalStatus === 'failed') {
          updateData['failed_at'] = new Date();
          updateData['error_message'] = (eventPayload['errorMessage'] || 'Delivery failed') as string;
        }

        await this.prisma.communicationLog.update({
          where: { id: log.id },
          data: updateData,
        });

        await this.updateMessageStatus(log.message.id, internalStatus);
        processed++;
      }

      this.logger.log(`WhatsApp webhook: ${statusType} for ${destination}, processed=${processed}`);
      return { processed, status: internalStatus };
    }

    // Handle incoming messages (session messaging — 24hr reply window)
    if (eventType === 'message') {
      const msgPayload = payload['payload'] as Record<string, unknown> | undefined;
      if (!msgPayload) return { type: 'message', processed: false };

      const from = msgPayload['source'] as string;
      const text = (msgPayload['payload'] as Record<string, unknown>)?.['text'] as string || '';

      this.logger.log(`WhatsApp incoming message from ${from}: ${text.substring(0, 50)}`);

      // Track the session window — patient responded, so free-form messaging is open for 24hrs
      // In production, store session windows per-patient for cost optimization
      return { type: 'message', from, text: text.substring(0, 200), session_open: true };
    }

    return { processed: 0, type: eventType };
  }

  // ─── NDNC Registry Check ───

  /**
   * Check if a phone number is registered in the NDNC (National Do Not Call) registry.
   * This is an optional compliance check before sending the first SMS to a patient.
   * Returns true if the number is on the NDNC list (should not receive promotional SMS).
   *
   * Note: Actual NDNC API requires registration with TRAI. This provides the integration
   * point — configure NDNC_API_URL and NDNC_API_KEY env vars when credentials are obtained.
   */
  async checkNdncStatus(phone: string): Promise<{ is_ndnc: boolean; checked: boolean; message: string }> {
    const ndncApiUrl = this.configService.get<string>('app.ndnc.apiUrl');
    const ndncApiKey = this.configService.get<string>('app.ndnc.apiKey');

    if (!ndncApiUrl || !ndncApiKey) {
      return {
        is_ndnc: false,
        checked: false,
        message: 'NDNC check not configured. Set NDNC_API_URL and NDNC_API_KEY env vars.',
      };
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^91/, '');

    try {
      const response = await fetch(`${ndncApiUrl}/check?phone=${encodeURIComponent(cleanPhone)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ndncApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`NDNC check failed (${response.status}) for ${cleanPhone}`);
        return { is_ndnc: false, checked: false, message: `NDNC API error: ${response.status}` };
      }

      const data = await response.json() as { is_ndnc?: boolean };
      return {
        is_ndnc: !!data.is_ndnc,
        checked: true,
        message: data.is_ndnc ? 'Number is on NDNC registry' : 'Number is not on NDNC registry',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`NDNC check error for ${cleanPhone}: ${msg}`);
      return { is_ndnc: false, checked: false, message: `NDNC check error: ${msg}` };
    }
  }

  // ─── Enhanced HTML Email Rendering ───

  // ─── WhatsApp Template Approval (5.2) ───

  async submitWhatsAppTemplate(clinicId: string, templateData: {
    elementName: string;
    languageCode: string;
    category: string;
    templateType: string;
    body: string;
    header?: string;
    footer?: string;
  }) {
    await this.ensureProvidersConfigured(clinicId);
    const result = await this.whatsAppProvider.submitTemplate(clinicId, templateData);

    // If successful, create/update the DB template record
    if (result.success) {
      await this.prisma.messageTemplate.upsert({
        where: {
          id: result.templateId || '',
        },
        create: {
          clinic_id: clinicId,
          channel: 'whatsapp',
          category: templateData.category === 'MARKETING' ? 'campaign' : 'transactional',
          template_name: templateData.elementName,
          body: templateData.body,
          language: templateData.languageCode,
          whatsapp_template_status: 'submitted',
          is_active: false,
        },
        update: {
          whatsapp_template_status: 'submitted',
        },
      });
    }

    return result;
  }

  async getWhatsAppTemplateStatus(clinicId: string, templateName: string) {
    await this.ensureProvidersConfigured(clinicId);
    const status = await this.whatsAppProvider.getTemplateStatus(clinicId, templateName);

    // Sync status to DB
    if (status.status === 'APPROVED' || status.status === 'REJECTED') {
      await this.prisma.messageTemplate.updateMany({
        where: {
          clinic_id: clinicId,
          template_name: templateName,
          channel: 'whatsapp',
        },
        data: {
          whatsapp_template_status: status.status.toLowerCase(),
          is_active: status.status === 'APPROVED',
        },
      });
    }

    return status;
  }

  renderRichEmailHtml(body: string, subject?: string, options?: {
    clinicName?: string;
    clinicLogo?: string;
    footerText?: string;
    ctaText?: string;
    ctaUrl?: string;
    preheader?: string;
  }): string {
    const clinicName = options?.clinicName || 'DentalCare';
    const preheader = options?.preheader || '';

    // Convert newlines to paragraphs and handle bullet lists
    const processedBody = body
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
          return `<li style="margin: 4px 0; line-height: 1.6;">${this.escapeHtml(trimmed.substring(2))}</li>`;
        }
        return `<p style="margin: 0 0 12px 0; line-height: 1.6;">${this.escapeHtml(trimmed)}</p>`;
      })
      .join('\n')
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, match =>
        `<ul style="margin: 12px 0; padding-left: 20px;">${match}</ul>`
      );

    const ctaBlock = options?.ctaUrl && options?.ctaText
      ? `<tr><td style="padding: 16px 32px;">
          <a href="${this.escapeHtml(options.ctaUrl)}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #0d9488, #0891b2); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
            ${this.escapeHtml(options.ctaText)}
          </a>
        </td></tr>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>@media only screen and (max-width: 600px){.email-container{width:100% !important;}}</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f4f4f7;line-height:1px;max-height:0;overflow:hidden;">${this.escapeHtml(preheader)}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 24px 0;">
    <tr><td align="center">
      <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background: linear-gradient(135deg, #0d9488, #0891b2); padding: 24px 32px;">
          ${options?.clinicLogo ? `<img src="${this.escapeHtml(options.clinicLogo)}" alt="${this.escapeHtml(clinicName)}" style="max-height: 40px; margin-bottom: 8px;" />` : ''}
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">${this.escapeHtml(subject || 'Notification')}</h1>
        </td></tr>
        <tr><td style="padding: 32px; color: #374151; font-size: 15px;">
          ${processedBody}
        </td></tr>
        ${ctaBlock}
        <tr><td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
            ${this.escapeHtml(options?.footerText || `Sent by ${clinicName} • This is an automated message`)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
