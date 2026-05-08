import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { paginate } from '../../common/interfaces/paginated-result.interface.js';
import { encrypt, decrypt } from '../../common/utils/encryption.util.js';
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
import { PLATFORM_TEMPLATE_NAMES } from './platform-templates.js';

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

    // 4.7 WhatsApp quota check (skipped for Enterprise BYO-WABA clinics)
    if (dto.channel === 'whatsapp') {
      const quotaExceeded = await this.checkWhatsAppQuota(clinicId);
      if (quotaExceeded) {
        return this.createSkippedMessage(clinicId, dto, patient, 'whatsapp_quota_exceeded');
      }
    }

    // 5. Resolve message body (from template or direct)
    let body = dto.body || '';
    let subject = dto.subject;
    let html: string | undefined;

    let dltTemplateId: string | undefined;
    /** For WhatsApp: the Meta-approved template name (e.g. "appointment_reminder") */
    let whatsappTemplateName: string | undefined;
    /** For WhatsApp: ordered variable values matching Meta template {{1}}, {{2}}, etc. */
    let whatsappOrderedVars: string[] | undefined;
    /** Template language code for WhatsApp (e.g. 'en', 'en_US') */
    let whatsappLanguage: string | undefined;

    // Build enriched variables with common aliases so any template resolves cleanly.
    // e.g. automation sends patient_first_name → also available as {{name}}.
    const vars: Record<string, string> = { ...(dto.variables || {}) };
    if (!vars['name']) vars['name'] = vars['patient_first_name'] || vars['patient_name'] || '';
    if (!vars['code']) vars['code'] = vars['otp_code'] || '';

    if (dto.template_id) {
      const template = await this.templateService.findOne(clinicId, dto.template_id);

      // If the template uses numbered placeholders ({{1}}, {{2}}, ...) and the
      // caller passed named variables, map them into numbered keys so the
      // stored/displayed body renders correctly. The order is taken from
      // template.variables ([] | string[] | { body: string[] }).
      const rawVarsForRender = template.variables as unknown;
      let renderVarNames: string[] = [];
      if (Array.isArray(rawVarsForRender)) {
        renderVarNames = rawVarsForRender as string[];
      } else if (rawVarsForRender && typeof rawVarsForRender === 'object' && 'body' in rawVarsForRender) {
        renderVarNames = ((rawVarsForRender as { body?: string[] }).body) || [];
      }
      renderVarNames.forEach((name, i) => {
        const numKey = String(i + 1);
        if (vars[numKey] === undefined || vars[numKey] === '') {
          vars[numKey] = vars[name] ?? dto.variables?.[name] ?? '';
        }
      });

      body = this.renderer.render(template.body, vars);
      subject = subject || (template.subject ? this.renderer.render(template.subject, vars) : undefined);
      dltTemplateId = template.dlt_template_id ?? undefined;

      // For WhatsApp, pass the template name so the provider sends a proper
      // Meta template message (required for business-initiated conversations).
      // Build ordered variable values matching Meta's {{1}}, {{2}}, ... placeholders
      // using the template's variables array as the canonical order.
      if (dto.channel === 'whatsapp') {
        whatsappTemplateName = template.template_name;
        whatsappLanguage = template.language || 'en';

        // template.variables can be:
        //   - string[] like ["1","2","3"] (body vars only)
        //   - { body: ["1","2"], buttons: [{ type:"url", index:0 }] } (structured with button info)
        const rawVars = template.variables as unknown;
        let templateVarNames: string[] = [];
        let templateButtons: Array<{ type: string; index: number }> = [];

        if (Array.isArray(rawVars)) {
          templateVarNames = rawVars as string[];
        } else if (rawVars && typeof rawVars === 'object' && 'body' in rawVars) {
          const structured = rawVars as { body: string[]; buttons?: Array<{ type: string; index: number }> };
          templateVarNames = structured.body || [];
          templateButtons = structured.buttons || [];
        }

        if (templateVarNames.length > 0 && dto.variables) {
          whatsappOrderedVars = templateVarNames.map(
            (varName) => dto.variables?.[varName] || vars[varName] || '',
          );
        } else if (dto.variables && Object.keys(dto.variables).length > 0) {
          // Fallback: if template.variables is empty/null but caller provided
          // numbered variables (e.g. {"1": "John", "2": "Dr. Smith"}), use them directly.
          const numberedKeys = Object.keys(dto.variables).filter(k => /^\d+$/.test(k));
          if (numberedKeys.length > 0) {
            whatsappOrderedVars = numberedKeys
              .sort((a, b) => Number(a) - Number(b))
              .map(k => dto.variables![k]);
          }
        }

        // Only attach button params when the template explicitly declares URL
        // buttons with dynamic placeholders. Sending a button param to a
        // template that has no button component (or has a static URL button)
        // makes Meta reject with #132018 "Template does not contain button
        // components, no parameters allowed". When a template's URL button is
        // static, Meta uses its stored URL — we don't need to send anything.
        if (templateButtons.length > 0) {
          const rawSuffix = (dto.metadata?.['button_url_suffix'] as string | undefined) || '';
          const suffix = rawSuffix.replace(/&amp;/g, '&');
          const btnParams = templateButtons.map(btn => ({
            type: btn.type,
            index: btn.index,
            parameters: [dto.variables?.[`button_${btn.index}`] || suffix || ''],
          }));
          dto.metadata = { ...(dto.metadata || {}), whatsapp_button_params: btnParams };
        }

        this.logger.debug(
          `[WhatsApp] template="${whatsappTemplateName}" lang="${whatsappLanguage}" vars=${whatsappOrderedVars?.length ?? 0} (db_vars=${templateVarNames.length}, dto_vars=${dto.variables ? Object.keys(dto.variables).length : 0}, buttons=${templateButtons.length})`,
        );
      }
    }

    // Allow direct WhatsApp template sending without a DB template record.
    // Caller sets metadata.whatsapp_template_name = 'my_template_name' and passes
    // numbered variables {"1": val1, "2": val2, ...} in dto.variables.
    if (dto.channel === 'whatsapp' && !whatsappTemplateName && dto.metadata?.['whatsapp_template_name']) {
      whatsappTemplateName = dto.metadata['whatsapp_template_name'] as string;
      whatsappLanguage = (dto.metadata['whatsapp_language'] as string) || 'en';
      if (dto.variables) {
        const numberedKeys = Object.keys(dto.variables).filter(k => /^\d+$/.test(k));
        if (numberedKeys.length > 0) {
          whatsappOrderedVars = numberedKeys
            .sort((a, b) => Number(a) - Number(b))
            .map(k => dto.variables![k]);
        }
      }
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
      dto.metadata,
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
      // For SMS: DLT template ID; for WhatsApp: Meta-approved template name
      templateId: dto.channel === 'whatsapp' ? whatsappTemplateName : dltTemplateId,
      // For WhatsApp template messages: pass ordered variable values matching Meta's {{1}}, {{2}}, ...
      // Keys are 1-based ("1", "2", "3") to match Meta's {{1}}, {{2}}, {{3}} convention.
      variables: dto.channel === 'whatsapp' && whatsappOrderedVars
        ? Object.fromEntries(whatsappOrderedVars.map((v, i) => [String(i + 1), v]))
        : undefined,
      language: whatsappLanguage,
      metadata: dto.metadata,
      scheduledAt: dto.scheduled_at,
    });

    // 10.5 Increment usage counter (fire-and-forget — failure should not block send)
    this.incrementUsageCounter(clinicId, dto.channel).catch((err) =>
      this.logger.warn(`Failed to increment ${dto.channel} usage counter for clinic ${clinicId}: ${err instanceof Error ? err.message : String(err)}`),
    );

    // WhatsApp → Email mirror: whenever a transactional WhatsApp message is
    // sent, also send an email to the same patient as a backup channel.
    //
    // We DO NOT mirror in these cases (each would just create noise):
    //   • Promotional / campaign sends — patients shouldn't get duplicate marketing
    //   • Email channel disabled at the clinic — every mirror would just be skipped
    //   • Patient has no email on file
    //   • This call is itself a mirror (avoid recursion)
    const isPromotional = (dto.category || 'transactional') === 'promotional';
    const isAlreadyMirrored = dto.metadata?.['mirrored_from_channel'] === 'whatsapp';
    const emailEnabledAtClinic = this.isChannelEnabled(clinicSettings, 'email');
    if (
      dto.channel === 'whatsapp'
      && patient.email
      && !isPromotional
      && !isAlreadyMirrored
      && emailEnabledAtClinic
    ) {
      try {
        await this.sendMessage(clinicId, {
          patient_id: dto.patient_id,
          channel: 'email' as any,
          category: dto.category,
          subject: subject || 'Notification from your clinic',
          body,
          metadata: {
            ...(dto.metadata || {}),
            mirrored_from_channel: 'whatsapp',
            mirrored_from_message_id: message.id,
          },
          scheduled_at: dto.scheduled_at,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`WhatsApp→Email mirror failed for message ${message.id}: ${reason}`);
      }
    }

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

    try {
      return await this.prisma.communicationLog.create({ data: logData });
    } catch (err: unknown) {
      // P2025 = parent CommunicationMessage not found (system-level jobs with no pre-created DB record)
      if ((err as { code?: string })?.code === 'P2025') return;
      throw err;
    }
  }

  async updateMessageStatus(messageId: string, status: string) {
    try {
      return await this.prisma.communicationMessage.update({
        where: { id: messageId },
        data: {
          status,
          sent_at: status === 'sent' ? new Date() : undefined,
        },
      });
    } catch (err: unknown) {
      // P2025 = record not found (e.g. system-level jobs with no pre-created DB record)
      if ((err as { code?: string })?.code === 'P2025') return;
      throw err;
    }
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
      data.whatsapp_provider = 'meta';
    }

    const settings = await this.prisma.clinicCommunicationSettings.upsert({
      where: { clinic_id: clinicId },
      create: { clinic_id: clinicId, ...data },
      update: data,
    });

    // Invalidate per-clinic provider cache and reload from latest DB/env config.
    this.emailProvider.removeClinic(clinicId);
    this.smsProvider.removeClinic(clinicId);
    this.whatsAppProvider.removeClinic(clinicId);
    await this.loadAndConfigureProviders(clinicId);

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
    metadata?: Record<string, unknown>,
  ): Promise<boolean> {
    if (!templateId) return false; // no dedup for ad-hoc messages

    // Appointment reminders are already deduplicated by BullMQ deterministic job IDs
    // (job ID = "appointment:<id>:reminder:<1|2>"). Skipping dedup here allows both
    // reminder 1 and reminder 2 to send even though they use the same template.
    if (metadata?.['automation'] === 'appointment_reminder_patient') return false;

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
      case 'whatsapp': {
        // Normalize to 91XXXXXXXXXX for consistent grouping with inbound messages
        const digits = patient.phone.replace(/[^0-9]/g, '');
        const last10 = digits.slice(-10);
        return `91${last10}`;
      }
      case 'sms': return patient.phone;
      case 'in_app': return patient.phone;
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

  // ─── System-level message enqueue (creates DB record + enqueues job) ───

  /**
   * Create a CommunicationMessage record and enqueue the job.
   * Use this for system-initiated messages (crons, etc.) that bypass the
   * full SendMessageDto flow so they appear in the message dashboard.
   */
  async enqueueSystemMessage(opts: {
    clinicId: string;
    channel: string;
    to: string;
    category: string;
    templateId?: string;
    variables?: Record<string, string>;
    language?: string;
    body?: string;
    metadata?: Record<string, unknown>;
    jobOptions?: { attempts?: number };
  }): Promise<string> {
    const messageId = randomUUID();

    await this.prisma.communicationMessage.create({
      data: {
        id: messageId,
        clinic_id: opts.clinicId,
        channel: opts.channel,
        category: opts.category,
        recipient: opts.to,
        body: opts.body || '',
        status: 'queued',
        metadata: opts.metadata ? JSON.parse(JSON.stringify(opts.metadata)) : undefined,
      },
    });

    await this.producer.enqueue({
      messageId,
      clinicId: opts.clinicId,
      channel: opts.channel,
      to: opts.to,
      body: opts.body || '',
      templateId: opts.templateId,
      variables: opts.variables,
      language: opts.language,
      metadata: opts.metadata,
    }, opts.jobOptions);

    return messageId;
  }

  // ─── Provider Configuration (race-safe, per-clinic) ───

  /**
   * Ensure providers are configured for a clinic. Uses a per-clinic lock
   * to prevent race conditions where concurrent requests trigger duplicate
   * DB reads and configuration.
   */
  async ensureClinicProviders(clinicId: string): Promise<void> {
    return this.ensureProvidersConfigured(clinicId);
  }

  private async ensureProvidersConfigured(clinicId: string): Promise<void> {
    // Fast path: already configured
    if (this.emailProvider.isConfigured(clinicId) &&
        this.smsProvider.isConfigured(clinicId) &&
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
      // Double-check before removing — if another config happened, keep the lock
      // Wait a tick to ensure all concurrent calls see the configured state
      await new Promise(resolve => setImmediate(resolve));
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

    // Fallback: configure WhatsApp from env vars if not already configured
    if (!this.whatsAppProvider.isConfigured(clinicId)) {
      const envAccessToken = this.configService.get<string>('app.whatsapp.accessToken');
      const envPhoneNumberId = this.configService.get<string>('app.whatsapp.phoneNumberId');
      if (envAccessToken && envPhoneNumberId) {
        this.whatsAppProvider.configure(clinicId, {
          accessToken: envAccessToken,
          phoneNumberId: envPhoneNumberId,
          wabaId: this.configService.get<string>('app.whatsapp.wabaId'),
        }, 'meta');
        this.logger.log(`WhatsApp provider configured from env vars for clinic ${clinicId}`);
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

      const hasValidEmailConfig = Boolean(
        emailConfig.host &&
        emailConfig.user &&
        emailConfig.pass &&
        Number.isFinite(emailConfig.port) &&
        emailConfig.port > 0,
      );

      if (hasValidEmailConfig) {
        this.emailProvider.configure(clinicId, emailConfig, settings.email_provider);
        this.logger.log(`Email provider configured for clinic ${clinicId}: ${settings.email_provider}`);
      } else {
        this.logger.warn(`Clinic ${clinicId} has incomplete custom SMTP config; skipping clinic SMTP and using env fallback if available`);
      }
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

    // Configure WhatsApp provider (Meta Cloud API)
    if (settings.enable_whatsapp && settings.whatsapp_config && settings.whatsapp_provider) {
      const raw = settings.whatsapp_config as Record<string, unknown>;
      const rawToken = (raw.accessToken ?? raw.access_token) as string;

      try {
        const waConfig: WhatsAppProviderConfig = {
          accessToken: decrypt(rawToken),
          phoneNumberId: (raw.phoneNumberId ?? raw.phone_number_id) as string,
          wabaId: (raw.wabaId ?? raw.waba_id) as string | undefined,
        };
        this.whatsAppProvider.configure(clinicId, waConfig, settings.whatsapp_provider);
        this.logger.log(`WhatsApp provider configured for clinic ${clinicId}: ${settings.whatsapp_provider}`);
      } catch (decryptError) {
        this.logger.error(
          `WhatsApp provider config failed for clinic ${clinicId}: decryption error — ${decryptError instanceof Error ? decryptError.message : String(decryptError)}. ` +
          `Check that encryption keys match and token is valid.`,
        );
      }
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
            Sent by Smart Dental Desk Platform &bull; This is an automated message
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
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 0.5; // 50% failure rate
  private static readonly CIRCUIT_BREAKER_MIN_SAMPLE = 20; // minimum messages before tripping
  private static readonly CIRCUIT_BREAKER_LOOKBACK_MS = 60 * 60 * 1000; // only look at last 1 hour

  /** Get circuit breaker status for all channels in a clinic */
  async getCircuitBreakerStatus(clinicId: string) {
    const channels = ['email', 'sms', 'whatsapp'];
    const result: Record<string, { is_open: boolean; failure_rate: number; sample_size: number }> = {};
    const since = new Date(Date.now() - CommunicationService.CIRCUIT_BREAKER_LOOKBACK_MS);

    for (const channel of channels) {
      const recentMessages = await this.prisma.communicationMessage.findMany({
        where: {
          clinic_id: clinicId,
          channel,
          status: { in: ['sent', 'delivered', 'failed'] },
          created_at: { gte: since },
        },
        orderBy: { created_at: 'desc' },
        take: CommunicationService.CIRCUIT_BREAKER_WINDOW,
        select: { status: true },
      });

      const failedCount = recentMessages.filter((m) => m.status === 'failed').length;
      const failureRate = recentMessages.length > 0 ? failedCount / recentMessages.length : 0;

      result[channel] = {
        is_open: recentMessages.length >= CommunicationService.CIRCUIT_BREAKER_MIN_SAMPLE && failureRate >= CommunicationService.CIRCUIT_BREAKER_THRESHOLD,
        failure_rate: Math.round(failureRate * 1000) / 10,
        sample_size: recentMessages.length,
      };
    }

    return result;
  }

  /**
   * Check if the circuit breaker is open for a clinic + channel.
   * Looks at the last 100 messages in the past hour — if >50% failed and
   * there are at least 20 samples, the channel is paused.
   */
  private async isCircuitOpen(clinicId: string, channel: string): Promise<boolean> {
    const since = new Date(Date.now() - CommunicationService.CIRCUIT_BREAKER_LOOKBACK_MS);
    const recentMessages = await this.prisma.communicationMessage.findMany({
      where: {
        clinic_id: clinicId,
        channel,
        status: { in: ['sent', 'delivered', 'failed'] },
        created_at: { gte: since },
      },
      orderBy: { created_at: 'desc' },
      take: CommunicationService.CIRCUIT_BREAKER_WINDOW,
      select: { status: true },
    });

    // Not enough data to trip the breaker
    if (recentMessages.length < CommunicationService.CIRCUIT_BREAKER_MIN_SAMPLE) return false;

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

  // ─── WhatsApp Quota & Usage Tracking ───

  async getUsage(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        has_own_waba: true,
        billing_cycle: true,
        plan_id: true,
        plan: {
          select: {
            name: true,
            whatsapp_included_monthly: true,
            whatsapp_hard_limit_monthly: true,
            allow_whatsapp_overage_billing: true,
          },
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException(`Clinic ${clinicId} not found`);
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usage = await this.prisma.clinicUsageCounter.findUnique({
      where: {
        clinic_id_period_start: {
          clinic_id: clinicId,
          period_start: periodStart,
        },
      },
    });

    const whatsappSent = usage?.whatsapp_sent ?? 0;
    const smsSent = usage?.sms_sent ?? 0;
    const emailSent = usage?.email_sent ?? 0;

    const waIncluded = clinic.plan?.whatsapp_included_monthly ?? 0;
    const waHardLimit = clinic.plan?.whatsapp_hard_limit_monthly ?? null;
    const allowOverage = clinic.plan?.allow_whatsapp_overage_billing ?? false;

    const isByoWaba = clinic.has_own_waba;
    const waRemaining = isByoWaba
      ? null
      : waHardLimit !== null
      ? Math.max(0, waHardLimit - whatsappSent)
      : null;
    const waApproachingLimit = !isByoWaba && waIncluded > 0 && whatsappSent >= waIncluded;
    const waBlocked = !isByoWaba && waHardLimit !== null && whatsappSent >= waHardLimit;

    return {
      clinic_id: clinic.id,
      plan: clinic.plan?.name ?? null,
      billing_cycle: clinic.billing_cycle,
      has_own_waba: isByoWaba,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      whatsapp: {
        sent: whatsappSent,
        included: waIncluded,
        hard_limit: waHardLimit,
        remaining: waRemaining,
        allow_overage: allowOverage,
        approaching_limit: waApproachingLimit,
        blocked: waBlocked,
      },
      sms: {
        sent: smsSent,
      },
      email: {
        sent: emailSent,
      },
    };
  }

  private async checkWhatsAppQuota(clinicId: string): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        has_own_waba: true,
        plan_id: true,
      },
    });

    if (!clinic) return false;

    if (clinic.has_own_waba) return false;

    if (!clinic.plan_id) return false;

    const plan = await this.prisma.plan.findUnique({
      where: { id: clinic.plan_id },
      select: { whatsapp_hard_limit_monthly: true },
    });

    if (!plan?.whatsapp_hard_limit_monthly || plan.whatsapp_hard_limit_monthly <= 0) {
      return false;
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await this.prisma.clinicUsageCounter.findUnique({
      where: {
        clinic_id_period_start: {
          clinic_id: clinicId,
          period_start: periodStart,
        },
      },
      select: { whatsapp_sent: true },
    });

    const currentUsage = usage?.whatsapp_sent ?? 0;
    return currentUsage >= plan.whatsapp_hard_limit_monthly;
  }

  private async incrementUsageCounter(clinicId: string, channel: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let column: 'whatsapp_sent' | 'sms_sent' | 'email_sent';
    if (channel === 'whatsapp') {
      column = 'whatsapp_sent';
    } else if (channel === 'sms') {
      column = 'sms_sent';
    } else if (channel === 'email') {
      column = 'email_sent';
    } else {
      return;
    }

    await this.prisma.clinicUsageCounter.upsert({
      where: {
        clinic_id_period_start: {
          clinic_id: clinicId,
          period_start: periodStart,
        },
      },
      create: {
        clinic_id: clinicId,
        period_start: periodStart,
        [column]: 1,
      },
      update: {
        [column]: { increment: 1 },
      },
    });
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

  // ─── WhatsApp Webhook (Meta Cloud API) ───

  /**
   * Process Meta WhatsApp Cloud API webhook events.
   *
   * Meta sends: {
   *   object: 'whatsapp_business_account',
   *   entry: [{ id: WABA_ID, changes: [{ value: { ... }, field: 'messages' }] }]
   * }
   *
   * value.statuses[] — delivery/read receipts
   * value.messages[] — incoming messages from patients
   */
  async handleWhatsAppWebhook(payload: Record<string, unknown>) {
    if (payload['object'] !== 'whatsapp_business_account') {
      this.logger.warn(`WhatsApp webhook: unexpected object type "${payload['object']}"`);
      return { processed: 0 };
    }

    const entries = payload['entry'] as Array<Record<string, unknown>> | undefined;
    if (!entries || entries.length === 0) return { processed: 0 };

    let totalProcessed = 0;

    for (const entry of entries) {
      const changes = entry['changes'] as Array<Record<string, unknown>> | undefined;
      if (!changes) continue;

      for (const change of changes) {
        if (change['field'] !== 'messages') continue;

        const value = change['value'] as Record<string, unknown> | undefined;
        if (!value) continue;

        // ─── Handle delivery/read status updates ───
        const statuses = value['statuses'] as Array<Record<string, unknown>> | undefined;
        if (statuses) {
          for (const status of statuses) {
            const processed = await this.processMetaStatusUpdate(status);
            totalProcessed += processed;
          }
        }

        // ─── Handle incoming messages ───
        const messages = value['messages'] as Array<Record<string, unknown>> | undefined;
        if (messages) {
          for (const msg of messages) {
            await this.processMetaIncomingMessage(msg, value);
            totalProcessed++;
          }
        }
      }
    }

    return { processed: totalProcessed };
  }

  /**
   * Process a single status update from Meta Cloud API.
   * Status object: { id: 'wamid.xxx', status: 'sent'|'delivered'|'read'|'failed', timestamp, recipient_id, errors? }
   */
  private async processMetaStatusUpdate(status: Record<string, unknown>): Promise<number> {
    const providerMessageId = status['id'] as string;
    const statusType = status['status'] as string;
    const recipientId = status['recipient_id'] as string;

    if (!providerMessageId) return 0;

    const statusMap: Record<string, string> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };

    const internalStatus = statusMap[statusType];
    if (!internalStatus) return 0;

    let processed = 0;

    // Path 1: Update via communicationLog (messages sent through Communication module)
    const logs = await this.prisma.communicationLog.findMany({
      where: { provider_message_id: providerMessageId, channel: 'whatsapp' },
      include: { message: { select: { id: true } } },
    });

    for (const log of logs) {
      const updateData: Record<string, unknown> = { status: internalStatus };
      if (internalStatus === 'delivered') updateData['delivered_at'] = new Date();
      if (internalStatus === 'read') updateData['read_at'] = new Date();
      if (internalStatus === 'failed') {
        updateData['failed_at'] = new Date();
        const errors = status['errors'] as Array<Record<string, unknown>> | undefined;
        const errorMsg = errors?.[0]?.['title'] as string || 'Delivery failed';
        updateData['error_message'] = errorMsg;
      }

      await this.prisma.communicationLog.update({
        where: { id: log.id },
        data: updateData,
      });

      await this.updateMessageStatus(log.message.id, internalStatus);
      processed++;
    }

    // Path 2: Update via wa_message_id directly on communicationMessage (inbox replies)
    if (processed === 0) {
      const directMsg = await this.prisma.communicationMessage.findFirst({
        where: { wa_message_id: providerMessageId },
        select: { id: true, status: true },
      });

      if (directMsg) {
        const statusPriority: Record<string, number> = { failed: 0, sent: 1, delivered: 2, read: 3 };
        const currentPriority = statusPriority[directMsg.status] ?? -1;
        const newPriority = statusPriority[internalStatus] ?? -1;

        if (newPriority > currentPriority) {
          await this.prisma.communicationMessage.update({
            where: { id: directMsg.id },
            data: { status: internalStatus },
          });
          processed++;
        }
      }
    }

    // Path 3: Platform messages (Smart Dental Desk business inbox)
    if (processed === 0) {
      const platformMsg = await this.prisma.platformMessage.findFirst({
        where: { wa_message_id: providerMessageId },
        select: { id: true, status: true },
      });

      if (platformMsg) {
        const statusPriority: Record<string, number> = { failed: 0, sent: 1, delivered: 2, read: 3 };
        const currentPriority = statusPriority[platformMsg.status] ?? -1;
        const newPriority = statusPriority[internalStatus] ?? -1;

        if (newPriority > currentPriority) {
          await this.prisma.platformMessage.update({
            where: { id: platformMsg.id },
            data: { status: internalStatus },
          });
          processed++;
        }
      }
    }

    this.logger.log(`WhatsApp webhook: ${statusType} for ${recipientId}, processed=${processed}`);
    return processed;
  }

  /**
   * Store an inbound WhatsApp message received on the platform's business number.
   * These messages are NOT tied to any clinic — they go into the super admin inbox.
   */
  private async storePlatformInboundMessage(
    msg: Record<string, unknown>,
    from: string,
    msgType: string,
    text: string,
    waMessageId: string,
    phoneNumberId: string,
  ): Promise<void> {
    // Idempotency — skip if this wamid is already stored
    if (waMessageId) {
      const existing = await this.prisma.platformMessage.findFirst({
        where: { wa_message_id: waMessageId },
        select: { id: true },
      });
      if (existing) return;
    }

    // Extract contact name from the webhook contacts array if available
    const mediaData: Record<string, string | undefined> = { type: msgType, phone_number_id: phoneNumberId };
    if (['image', 'document', 'audio', 'video'].includes(msgType)) {
      const mediaObj = msg[msgType] as Record<string, unknown> | undefined;
      if (mediaObj) {
        mediaData['media_id'] = mediaObj['id'] as string;
        mediaData['mime_type'] = mediaObj['mime_type'] as string;
        if (mediaObj['caption']) mediaData['caption'] = mediaObj['caption'] as string;
        if (mediaObj['filename']) mediaData['filename'] = mediaObj['filename'] as string;
      }
    }

    await this.prisma.platformMessage.create({
      data: {
        direction: 'inbound',
        channel: 'whatsapp',
        from_phone: from,
        to_phone: phoneNumberId,
        contact_phone: from,
        body: text,
        message_type: msgType,
        status: 'delivered',
        wa_message_id: waMessageId || null,
        sent_at: new Date(),
        metadata: mediaData,
      },
    });

    this.logger.log(`Platform inbound stored: from=${from}, type=${msgType}`);
  }

  /**
   * Process an incoming message from Meta Cloud API.
   * Message object: { from: '91xxxxxxxxxx', id: 'wamid.xxx', timestamp, type: 'text', text: { body: '...' } }
   */
  private async processMetaIncomingMessage(
    msg: Record<string, unknown>,
    value: Record<string, unknown>,
  ): Promise<void> {
    const from = msg['from'] as string;
    const msgType = msg['type'] as string;
    const waMessageId = msg['id'] as string;
    let text = '';

    if (msgType === 'text') {
      const textObj = msg['text'] as Record<string, unknown> | undefined;
      text = (textObj?.['body'] as string) || '';
    } else if (msgType === 'button') {
      const buttonObj = msg['button'] as Record<string, unknown> | undefined;
      text = (buttonObj?.['text'] as string) || `[Button: ${(buttonObj?.['payload'] as string) || ''}]`;
    } else if (msgType === 'interactive') {
      const interactive = msg['interactive'] as Record<string, unknown> | undefined;
      const buttonReply = interactive?.['button_reply'] as Record<string, unknown> | undefined;
      text = (buttonReply?.['title'] as string) || '';
    } else if (msgType === 'image') {
      text = '[Image]';
    } else if (msgType === 'audio') {
      text = '[Audio]';
    } else if (msgType === 'document') {
      text = '[Document]';
    } else if (msgType === 'location') {
      text = '[Location]';
    } else {
      text = `[${msgType}]`;
    }

    this.logger.log(`WhatsApp incoming message from ${from} (type: ${msgType}): ${text.substring(0, 50)}`);

    // The phone_number_id tells us which WABA number received the message
    const metadata = value['metadata'] as Record<string, unknown> | undefined;
    const phoneNumberId = metadata?.['phone_number_id'] as string;
    const platformPhoneNumberId = this.configService.get<string>('app.whatsapp.phoneNumberId');

    // Platform-level routing: messages to the Smart Dental Desk business number
    // are stored separately (not under any clinic) and visible in super admin inbox.
    if (phoneNumberId && platformPhoneNumberId && phoneNumberId === platformPhoneNumberId) {
      await this.storePlatformInboundMessage(msg, from, msgType, text, waMessageId, phoneNumberId);
      return;
    }

    // Find clinic by phone number ID
    let clinicId: string | null = null;
    if (phoneNumberId) {
      try {
        const settings = await this.prisma.clinicCommunicationSettings.findFirst({
          where: {
            whatsapp_config: {
              path: ['phoneNumberId'],
              equals: phoneNumberId,
            },
          },
          select: { clinic_id: true },
        });
        clinicId = settings?.clinic_id ?? null;
      } catch {
        // JSON path query not supported — try alternate approach
        const allSettings = await this.prisma.clinicCommunicationSettings.findMany({
          where: { enable_whatsapp: true },
          select: { clinic_id: true, whatsapp_config: true },
        });
        for (const s of allSettings) {
          const cfg = s.whatsapp_config as Record<string, unknown> | null;
          if (cfg?.['phoneNumberId'] === phoneNumberId || cfg?.['phone_number_id'] === phoneNumberId) {
            clinicId = s.clinic_id;
            break;
          }
        }
      }
    }

    if (!clinicId) {
      this.logger.warn(`WhatsApp inbound: no clinic found for phone_number_id=${phoneNumberId}, from=${from}`);
      return;
    }

    // Skip duplicate (idempotency) — same wa_message_id already stored
    if (waMessageId) {
      const existing = await this.prisma.communicationMessage.findFirst({
        where: { wa_message_id: waMessageId },
        select: { id: true },
      });
      if (existing) return;
    }

    // Find patient by phone number in this clinic
    const cleanPhone = from.replace(/^91/, '').replace(/[^0-9]/g, '');
    const patient = await this.prisma.patient.findFirst({
      where: {
        clinic_id: clinicId,
        OR: [
          { phone: cleanPhone },
          { phone: `91${cleanPhone}` },
          { phone: `+91${cleanPhone}` },
          { phone: from },
        ],
      },
      select: { id: true },
    });

    // Extract media URL if present (image, document, audio, video)
    const mediaData: Record<string, string | undefined> = { type: msgType, phone_number_id: phoneNumberId };
    if (['image', 'document', 'audio', 'video'].includes(msgType)) {
      const mediaObj = msg[msgType] as Record<string, unknown> | undefined;
      if (mediaObj) {
        mediaData['media_id'] = mediaObj['id'] as string;
        mediaData['mime_type'] = mediaObj['mime_type'] as string;
        if (mediaObj['caption']) mediaData['caption'] = mediaObj['caption'] as string;
        if (mediaObj['filename']) mediaData['filename'] = mediaObj['filename'] as string;
      }
    }

    await this.prisma.communicationMessage.create({
      data: {
        clinic_id: clinicId,
        patient_id: patient?.id ?? null,
        channel: 'whatsapp',
        category: 'transactional',
        body: text,
        recipient: from,
        status: 'delivered',
        direction: 'inbound',
        wa_message_id: waMessageId || null,
        sent_at: new Date(),
        metadata: mediaData,
      },
    });

    // Track incoming message for session window management
    this.whatsAppProvider.trackIncomingMessage(clinicId, from);

    this.logger.log(`WhatsApp inbound stored: clinic=${clinicId}, from=${from}, patient=${patient?.id ?? 'unknown'}`);
  }

  // ─── WhatsApp Inbox ───

  async getInboxConversations(clinicId: string, page = 1, limit = 30) {
    const offset = (page - 1) * limit;

    // Get latest message per unique phone number using window functions for performance
    // Normalize phone numbers: strip leading '+' and ensure '91' prefix for consistent grouping
    const rows = await this.prisma.$queryRaw<Array<{
      recipient: string;
      patient_id: string | null;
      patient_name: string | null;
      last_body: string;
      last_at: Date;
      last_direction: string;
      last_status: string;
      unread_count: bigint;
      last_inbound_at: Date | null;
      total: bigint;
    }>>`
      WITH ranked AS (
        SELECT
          m.recipient,
          CASE
            WHEN LENGTH(REGEXP_REPLACE(m.recipient, '[^0-9]', '', 'g')) = 10
            THEN '91' || REGEXP_REPLACE(m.recipient, '[^0-9]', '', 'g')
            ELSE REGEXP_REPLACE(m.recipient, '[^0-9]', '', 'g')
          END AS normalized_phone,
          m.patient_id,
          m.body,
          m.direction,
          m.status,
          m.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                WHEN LENGTH(REGEXP_REPLACE(m.recipient, '[^0-9]', '', 'g')) = 10
                THEN '91' || REGEXP_REPLACE(m.recipient, '[^0-9]', '', 'g')
                ELSE REGEXP_REPLACE(m.recipient, '[^0-9]', '', 'g')
              END
            ORDER BY m.created_at DESC
          ) AS rn
        FROM communication_messages m
        WHERE m.clinic_id = ${clinicId} AND m.channel = 'whatsapp'
      ),
      conversations AS (
        SELECT
          r.normalized_phone AS recipient,
          r.patient_id,
          CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
          r.body AS last_body,
          r.created_at AS last_at,
          r.direction AS last_direction,
          r.status AS last_status,
          (SELECT COUNT(*) FROM ranked u WHERE u.normalized_phone = r.normalized_phone AND u.direction = 'inbound' AND u.status != 'read') AS unread_count,
          (SELECT MAX(u.created_at) FROM ranked u WHERE u.normalized_phone = r.normalized_phone AND u.direction = 'inbound') AS last_inbound_at
        FROM ranked r
        LEFT JOIN patients p ON p.id = r.patient_id
        WHERE r.rn = 1
      )
      SELECT
        c.*,
        COUNT(*) OVER () AS total
      FROM conversations c
      ORDER BY c.last_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = rows[0] ? Number(rows[0].total) : 0;

    return {
      data: rows.map((r) => ({
        phone: r.recipient,
        patient_id: r.patient_id,
        patient_name: r.patient_name ?? r.recipient,
        last_message: r.last_body,
        last_at: r.last_at,
        last_direction: r.last_direction,
        last_status: r.last_status,
        last_inbound_at: r.last_inbound_at,
        unread_count: Number(r.unread_count),
      })),
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async getConversationMessages(clinicId: string, phone: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    // Normalize phone: build list of possible formats to match across stored variations
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    const last10 = digitsOnly.slice(-10);
    const phoneVariants = [...new Set([phone, digitsOnly, last10, `91${last10}`, `+91${last10}`])];

    const whereClause = { clinic_id: clinicId, channel: 'whatsapp' as const, recipient: { in: phoneVariants } };

    const [messages, total] = await Promise.all([
      this.prisma.communicationMessage.findMany({
        where: whereClause,
        orderBy: { created_at: 'asc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          body: true,
          direction: true,
          status: true,
          wa_message_id: true,
          created_at: true,
          sent_at: true,
          metadata: true,
          template: { select: { template_name: true } },
        },
      }),
      this.prisma.communicationMessage.count({
        where: whereClause,
      }),
    ]);

    // Mark inbound messages as read and send read receipts back to Meta
    const unreadInbound = await this.prisma.communicationMessage.findMany({
      where: {
        clinic_id: clinicId,
        channel: 'whatsapp',
        recipient: { in: phoneVariants },
        direction: 'inbound',
        status: { not: 'read' },
        wa_message_id: { not: null },
      },
      select: { id: true, wa_message_id: true },
    });

    if (unreadInbound.length > 0) {
      await this.prisma.communicationMessage.updateMany({
        where: {
          id: { in: unreadInbound.map((m) => m.id) },
        },
        data: { status: 'read' },
      });

      // Send read receipts to Meta with retry logic
      // Queue for async processing so it doesn't block the response
      this.queueMetaReadReceipts(clinicId, unreadInbound.map((m) => m.wa_message_id!));
    }

    return {
      data: messages,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Send a WhatsApp template message to an arbitrary phone number that is
   * not necessarily a patient (e.g. a staff member / consultant). Bypasses
   * patient-preference / DND / dedup checks because those are designed for
   * patient flows; staff alerts are internal communications. Still respects
   * clinic enable_whatsapp + WhatsApp monthly quota and stores a
   * CommunicationMessage row (patient_id=null) for audit + delivery
   * tracking.
   *
   * Returns null when skipped (template missing, channel disabled, quota
   * exhausted, or no recipient phone).
   */
  async sendStaffWhatsAppTemplate(
    clinicId: string,
    recipientPhone: string,
    templateName: string,
    namedVars: Record<string, string>,
    metadata?: Record<string, unknown>,
  ): Promise<{ messageId: string } | null> {
    if (!recipientPhone || !recipientPhone.trim()) {
      this.logger.warn(`Staff WhatsApp send skipped — no recipient phone (template=${templateName})`);
      return null;
    }

    await this.ensureProvidersConfigured(clinicId);

    const clinicSettings = await this.getOrCreateClinicSettings(clinicId);
    if (!this.isChannelEnabled(clinicSettings, 'whatsapp')) {
      this.logger.log(`Staff WhatsApp send skipped — clinic ${clinicId} WhatsApp disabled (template=${templateName})`);
      return null;
    }

    const quotaExceeded = await this.checkWhatsAppQuota(clinicId);
    if (quotaExceeded) {
      this.logger.warn(`Staff WhatsApp send skipped — clinic ${clinicId} WhatsApp quota exceeded`);
      return null;
    }

    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: templateName,
        channel: 'whatsapp',
        is_active: true,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' },
    });

    if (!template) {
      this.logger.warn(`Staff WhatsApp send skipped — template "${templateName}" not found`);
      return null;
    }

    // Resolve ordered body vars from template.variables config
    const rawVars = template.variables as unknown;
    let templateVarNames: string[] = [];
    if (Array.isArray(rawVars)) {
      templateVarNames = rawVars as string[];
    } else if (rawVars && typeof rawVars === 'object' && 'body' in rawVars) {
      templateVarNames = ((rawVars as { body?: string[] }).body) || [];
    }

    const orderedVars = templateVarNames.map((name) => namedVars[name] ?? '');
    const numberedVars = Object.fromEntries(orderedVars.map((v, i) => [String(i + 1), v]));

    // Render body locally for the audit row + dashboard display
    const renderedBody = this.sanitizeTextBody(this.renderer.render(template.body, namedVars));

    // Normalize phone (strip non-digits, keep last 10 → "91XXXXXXXXXX")
    const digitsOnly = recipientPhone.replace(/[^0-9]/g, '');
    const last10 = digitsOnly.slice(-10);
    const normalizedPhone = last10.length === 10 ? `91${last10}` : digitsOnly;

    const mergedMetadata = { ...(metadata || {}), staff_recipient: true };

    const message = await this.prisma.communicationMessage.create({
      data: {
        clinic_id: clinicId,
        patient_id: null,
        template_id: template.id,
        channel: 'whatsapp',
        category: 'transactional',
        body: renderedBody,
        recipient: normalizedPhone,
        status: 'queued',
        direction: 'outbound',
        metadata: JSON.parse(JSON.stringify(mergedMetadata)),
      },
    });

    await this.producer.enqueue({
      messageId: message.id,
      clinicId,
      channel: 'whatsapp',
      to: normalizedPhone,
      body: renderedBody,
      templateId: template.template_name,
      variables: numberedVars,
      language: template.language || 'en',
      metadata: mergedMetadata,
    });

    this.incrementUsageCounter(clinicId, 'whatsapp').catch((err) =>
      this.logger.warn(`Failed to increment whatsapp usage counter: ${err instanceof Error ? err.message : String(err)}`),
    );

    return { messageId: message.id };
  }

  async sendInboxReply(clinicId: string, phone: string, body: string) {
    // Normalize phone to 91XXXXXXXXXX format for consistent storage
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    const last10 = digitsOnly.slice(-10);
    const normalizedPhone = `91${last10}`;
    const phoneVariants = [...new Set([normalizedPhone, last10, `+91${last10}`, phone])];

    // Find patient by phone
    const patient = await this.prisma.patient.findFirst({
      where: {
        clinic_id: clinicId,
        OR: phoneVariants.map((p) => ({ phone: p })),
      },
      select: { id: true },
    });

    // Check if within 24hr session window (last inbound message within 24hrs)
    const lastInbound = await this.prisma.communicationMessage.findFirst({
      where: { clinic_id: clinicId, channel: 'whatsapp', recipient: { in: phoneVariants }, direction: 'inbound' },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    const withinWindow = lastInbound
      ? (Date.now() - lastInbound.created_at.getTime()) < 24 * 60 * 60 * 1000
      : false;

    if (!withinWindow) {
      throw new BadRequestException(
        'Cannot send free-form message — no patient reply within last 24 hours. Use a template instead.',
      );
    }

    // Send via WhatsApp provider directly
    await this.ensureProvidersConfigured(clinicId);
    const result = await this.whatsAppProvider.sendFreeText(clinicId, normalizedPhone, body);

    // Store outbound with normalized phone
    const message = await this.prisma.communicationMessage.create({
      data: {
        clinic_id: clinicId,
        patient_id: patient?.id ?? null,
        channel: 'whatsapp',
        category: 'transactional',
        body,
        recipient: normalizedPhone,
        status: result.success ? 'sent' : 'failed',
        direction: 'outbound',
        wa_message_id: result.messageId ?? null,
        sent_at: new Date(),
      },
    });

    return { success: result.success, message_id: message.id };
  }

  /**
   * Queue read receipts for async processing with retry logic.
   * Decouples from request/response cycle so network issues don't block the API.
   */
  private queueMetaReadReceipts(clinicId: string, waMessageIds: string[]): void {
    // Schedule async processing with exponential backoff retry
    setImmediate(async () => {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await this.sendMetaReadReceipts(clinicId, waMessageIds);
          this.logger.debug(`Read receipts sent successfully after ${retryCount} retries`);
          return; // Success
        } catch (err) {
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
            this.logger.warn(
              `Read receipts failed (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`,
            );
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            this.logger.error(
              `Failed to send read receipts after ${maxRetries} attempts. Patients won't see blue ticks. ` +
              `Error: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    });
  }

  /**
   * Send read receipts back to Meta Cloud API so patients see blue ticks.
   * Batches requests for multiple message IDs.
   */
  private async sendMetaReadReceipts(clinicId: string, waMessageIds: string[]): Promise<void> {
    await this.ensureProvidersConfigured(clinicId);

    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: clinicId },
      select: { whatsapp_config: true },
    });

    const cfg = settings?.whatsapp_config as Record<string, string> | null;
    if (!cfg?.accessToken || !cfg?.phoneNumberId) return;

    // Access token is stored encrypted in the database — decrypt before use
    let token: string;
    try {
      token = decrypt(cfg.accessToken);
    } catch {
      token = cfg.accessToken; // Fallback if token was stored unencrypted (e.g., env var fallback)
    }

    const url = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;

    for (const messageId of waMessageIds) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Best-effort; don't block on receipt failures
      }
    }
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
      const existing = await this.prisma.messageTemplate.findFirst({
        where: { clinic_id: clinicId, template_name: templateData.elementName, channel: 'whatsapp', language: templateData.languageCode },
      });

      if (existing) {
        await this.prisma.messageTemplate.update({
          where: { id: existing.id },
          data: {
            body: templateData.body,
            subject: templateData.header ?? null,
            footer: templateData.footer ?? null,
            whatsapp_template_status: 'submitted',
            ...(result.templateId ? { meta_template_id: result.templateId } : {}),
          } as any,
        });
      } else {
        await this.prisma.messageTemplate.create({
          data: {
            clinic_id: clinicId,
            channel: 'whatsapp',
            category: templateData.category === 'MARKETING' ? 'campaign' : 'transactional',
            template_name: templateData.elementName,
            subject: templateData.header ?? null,
            footer: templateData.footer ?? null,
            body: templateData.body,
            language: templateData.languageCode,
            whatsapp_template_status: 'submitted',
            is_active: false,
            ...(result.templateId ? { meta_template_id: result.templateId } : {}),
          } as any,
        });
      }
    }

    return result;
  }

  /**
   * Sync all WhatsApp templates from Meta Cloud API into the local DB.
   * Creates new templates and updates status of existing ones.
   */
  async syncWhatsAppTemplates(clinicId: string) {
    await this.ensureProvidersConfigured(clinicId);
    const result = await this.whatsAppProvider.fetchAllTemplates(clinicId);

    if (!result.success || !result.templates) {
      return { success: false, error: result.error, synced: 0 };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const metaTemplate of result.templates) {
      try {
      // Skip platform-level templates (demo requests etc.) — not clinic-specific
      if (PLATFORM_TEMPLATE_NAMES.includes(metaTemplate.name as any)) {
        skipped++;
        continue;
      }

      // Extract body text and variables from Meta components
      const bodyComponent = metaTemplate.components.find(
        (c) => (c.type as string)?.toUpperCase() === 'BODY',
      );
      const bodyText = (bodyComponent?.text as string) || '';

      // Extract numbered variables {{1}}, {{2}} etc from body
      const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];

      // Build variable names as ordered array: ["1", "2", "3", ...]
      const variables = varMatches.map((m) => m.replace(/[{}]/g, ''));

      // Detect URL buttons with dynamic parameters
      const buttonsComponent = metaTemplate.components.find(
        (c) => (c.type as string)?.toUpperCase() === 'BUTTONS',
      );
      const urlButtons: Array<{ index: number; url: string }> = [];
      if (buttonsComponent) {
        const buttons = (buttonsComponent.buttons || []) as Array<Record<string, unknown>>;
        buttons.forEach((btn, idx) => {
          if ((btn.type as string)?.toUpperCase() === 'URL' && btn.url) {
            const btnUrl = btn.url as string;
            if (/\{\{\d+\}\}/.test(btnUrl)) {
              urlButtons.push({ index: idx, url: btnUrl });
            }
          }
        });
      }

      // Map Meta category to our category
      const categoryMap: Record<string, string> = {
        MARKETING: 'campaign',
        UTILITY: 'transactional',
        AUTHENTICATION: 'transactional',
      };
      const category = categoryMap[metaTemplate.category] || 'transactional';

      // Map Meta status to our status
      const statusMap: Record<string, string> = {
        APPROVED: 'approved',
        REJECTED: 'rejected',
        PENDING: 'submitted',
        IN_APPEAL: 'submitted',
        PENDING_DELETION: 'rejected',
        DELETED: 'rejected',
        DISABLED: 'rejected',
        PAUSED: 'submitted',
        LIMIT_EXCEEDED: 'rejected',
      };
      const whatsappStatus = statusMap[metaTemplate.status] || 'submitted';

      // Check if template already exists in DB
      const existing = await this.prisma.messageTemplate.findFirst({
        where: {
          clinic_id: clinicId,
          template_name: metaTemplate.name,
          channel: 'whatsapp',
          language: metaTemplate.language,
        },
      });

      // Build variables JSON: simple array when no buttons, structured object when URL buttons exist
      const variablesJson: unknown = urlButtons.length > 0
        ? { body: variables, buttons: urlButtons.map(b => ({ type: 'url', index: b.index })) }
        : (variables.length > 0 ? variables : undefined);

      if (existing) {
        // Update status, body, and meta_template_id if changed
        // Use 'as any' only for Prisma's JSON field handling — the data is validated/constructed above
        await this.prisma.messageTemplate.update({
          where: { id: existing.id },
          data: {
            whatsapp_template_status: whatsappStatus,
            is_active: metaTemplate.status === 'APPROVED',
            body: bodyText || existing.body,
            meta_template_id: metaTemplate.id,
            ...(variablesJson !== undefined ? { variables: variablesJson as any } : {}),
          } as any,
        });
        updated++;
      } else {
        // Create new template in DB
        // Use 'as any' only for Prisma's JSON field handling — the data is validated/constructed above
        await this.prisma.messageTemplate.create({
          data: {
            clinic_id: clinicId,
            channel: 'whatsapp',
            category,
            template_name: metaTemplate.name,
            body: bodyText || `[Template: ${metaTemplate.name}]`,
            ...(variablesJson !== undefined ? { variables: variablesJson as any } : {}),
            language: metaTemplate.language,
            whatsapp_template_status: whatsappStatus,
            is_active: metaTemplate.status === 'APPROVED',
            meta_template_id: metaTemplate.id,
          } as any,
        });
        created++;
      }
      } catch (e) {
        this.logger.error(`Sync failed for template "${metaTemplate.name}": ${(e as Error).message}`);
        skipped++;
      }
    }

    // Delete clinic WhatsApp templates that no longer exist in Meta
    const metaTemplateNames = result.templates.map((t) => t.name);
    const orphaned = await this.prisma.messageTemplate.findMany({
      where: {
        clinic_id: clinicId,
        channel: 'whatsapp',
        template_name: { notIn: metaTemplateNames },
      },
      select: { id: true, template_name: true },
    });

    let deleted = 0;
    if (orphaned.length > 0) {
      await this.prisma.messageTemplate.deleteMany({
        where: { id: { in: orphaned.map((o) => o.id) } },
      });
      deleted = orphaned.length;
      this.logger.log(
        `Deleted ${deleted} orphaned WhatsApp templates not found in Meta: ${orphaned.map((o) => o.template_name).join(', ')}`,
      );
    }

    this.logger.log(
      `WhatsApp template sync for clinic ${clinicId}: ${created} created, ${updated} updated, ${deleted} deleted, ${skipped} skipped (${result.templates.length} total from Meta)`,
    );

    return {
      success: true,
      total_from_meta: result.templates.length,
      created,
      updated,
      deleted,
      skipped,
    };
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

  /**
   * Delete a WhatsApp template from Meta AND from the local DB.
   * Uses template name (required by Meta's API) and optionally removes the local record.
   */
  async deleteWhatsAppTemplateFromMeta(clinicId: string, localTemplateId: string) {
    await this.ensureProvidersConfigured(clinicId);

    // Fetch local template to get its name (required by Meta delete API)
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id: localTemplateId, clinic_id: clinicId, channel: 'whatsapp' },
    });

    if (!template) {
      throw new Error(`WhatsApp template "${localTemplateId}" not found for this clinic`);
    }

    const metaResult = await this.whatsAppProvider.deleteTemplateFromMeta(clinicId, (template as any).template_name);

    if (!metaResult.success) {
      return { success: false, error: metaResult.error, local_deleted: false };
    }

    // Remove from local DB
    await this.prisma.messageTemplate.delete({ where: { id: localTemplateId } });

    return { success: true, local_deleted: true };
  }

  /**
   * Edit a WhatsApp template on Meta (only works when status = REJECTED).
   * Also updates the local DB record.
   */
  async editWhatsAppTemplateOnMeta(
    clinicId: string,
    localTemplateId: string,
    updateData: {
      body: string;
      header?: string;
      footer?: string;
      category?: string;
    },
  ) {
    await this.ensureProvidersConfigured(clinicId);

    const template = await this.prisma.messageTemplate.findFirst({
      where: { id: localTemplateId, clinic_id: clinicId, channel: 'whatsapp' },
    });

    if (!template) {
      throw new Error(`WhatsApp template "${localTemplateId}" not found for this clinic`);
    }

    const metaTemplateId = (template as any).meta_template_id;
    if (!metaTemplateId) {
      return {
        success: false,
        error: 'No Meta template ID stored for this template. Run a sync first.',
      };
    }

    if ((template as any).whatsapp_template_status !== 'rejected') {
      return {
        success: false,
        error: 'Only REJECTED templates can be edited on Meta. Current status: ' + (template as any).whatsapp_template_status,
      };
    }

    const metaResult = await this.whatsAppProvider.editTemplateOnMeta(clinicId, metaTemplateId, updateData);

    if (!metaResult.success) {
      return { success: false, error: metaResult.error };
    }

    // Update local DB with new body and reset status to submitted
    await this.prisma.messageTemplate.update({
      where: { id: localTemplateId },
      data: {
        body: updateData.body,
        whatsapp_template_status: 'submitted',
        is_active: false,
        ...(updateData.header ? { subject: updateData.header } : {}),
      } as any,
    });

    return { success: true };
  }

  renderRichEmailHtml(body: string, subject?: string, options?: {
    clinicName?: string;
    clinicLogo?: string;
    footerText?: string;
    ctaText?: string;
    ctaUrl?: string;
    preheader?: string;
  }): string {
    const clinicName = options?.clinicName || 'Smart Dental Desk';
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

  // ─── WhatsApp Embedded Signup ───

  private static readonly META_GRAPH_API = 'https://graph.facebook.com/v21.0';

  /**
   * Complete WhatsApp Embedded Signup flow:
   * 1. Exchange auth code for user access token
   * 2. Debug token to find shared WABA IDs
   * 3. Fetch phone numbers from the WABA
   * 4. Subscribe WABA to app webhooks
   * 5. Save credentials to clinic settings
   */
  async completeWhatsAppEmbeddedSignup(clinicId: string, code?: string, accessToken?: string, sessionPhoneNumberId?: string, sessionWabaId?: string, _redirectUri?: string) {
    const appId = this.configService.get<string>('app.facebook.appId');
    const appSecret = this.configService.get<string>('app.facebook.appSecret');

    if (!appId || !appSecret) {
      throw new InternalServerErrorException(
        'Facebook App ID and App Secret must be configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.',
      );
    }

    // --- Determine access token ---
    // Priority: 1) Direct accessToken from popup, 2) Code exchange, 3) System User token from env
    let userToken: string | undefined;

    if (accessToken) {
      this.logger.log(`Embedded Signup: using direct access token for clinic ${clinicId}`);
      userToken = accessToken;
    }

    if (!userToken && code) {
      // Try code exchange — this typically fails with the JS SDK popup (redirect_uri mismatch)
      // but we attempt it in case it works, and fall back to the System User token
      this.logger.log(`Embedded Signup: attempting code exchange for clinic ${clinicId}`);
      try {
        const tokenUrl = new URL(`${CommunicationService.META_GRAPH_API}/oauth/access_token`);
        tokenUrl.searchParams.set('client_id', appId);
        tokenUrl.searchParams.set('client_secret', appSecret);
        tokenUrl.searchParams.set('code', code);

        const tokenRes = await fetch(tokenUrl.toString());
        const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } };

        if (tokenRes.ok && tokenData.access_token) {
          this.logger.log(`Embedded Signup: code exchange successful for clinic ${clinicId}`);
          userToken = tokenData.access_token;
        } else {
          this.logger.warn(`Embedded Signup: code exchange failed (expected with JS SDK popup): ${JSON.stringify(tokenData)}`);
        }
      } catch (err) {
        this.logger.warn(`Embedded Signup: code exchange error: ${err}`);
      }
    }

    // Fallback: Use the System User access token from environment
    // When using a FB Login Config with System User token type, the System User
    // is automatically granted access to WABAs shared through Embedded Signup.
    if (!userToken) {
      const systemUserToken = this.configService.get<string>('app.whatsapp.accessToken');
      if (systemUserToken) {
        this.logger.log(`Embedded Signup: using System User token from environment for clinic ${clinicId}`);
        userToken = systemUserToken;
      } else {
        throw new BadRequestException(
          'Could not obtain access token. Please ensure WHATSAPP_ACCESS_TOKEN is configured.',
        );
      }
    }

    // --- Determine WABA ID ---
    // Priority: 1) Session info from popup, 2) debug_token, 3) env fallback
    let wabaId = sessionWabaId;

    if (!wabaId) {
      this.logger.log('Embedded Signup: no WABA from session, trying debug_token');
      try {
        const debugUrl = new URL(`${CommunicationService.META_GRAPH_API}/debug_token`);
        debugUrl.searchParams.set('input_token', userToken);
        debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);

        const debugRes = await fetch(debugUrl.toString());
        const debugData = await debugRes.json() as {
          data?: {
            granular_scopes?: Array<{
              permission: string;
              target_ids?: string[];
            }>;
          };
          error?: { message: string };
        };

        if (debugRes.ok) {
          const wabaScopes = debugData.data?.granular_scopes?.find(
            (s) => s.permission === 'whatsapp_business_management',
          );
          wabaId = wabaScopes?.target_ids?.[0];
        } else {
          this.logger.warn(`Embedded Signup debug_token failed: ${JSON.stringify(debugData)}`);
        }
      } catch (err) {
        this.logger.warn(`Embedded Signup debug_token error: ${err}`);
      }
    }

    // Final fallback: use WABA ID from environment
    if (!wabaId) {
      const envWabaId = this.configService.get<string>('app.whatsapp.wabaId');
      if (envWabaId) {
        this.logger.log(`Embedded Signup: using WABA ID from environment: ${envWabaId}`);
        wabaId = envWabaId;
      }
    }

    if (!wabaId) {
      this.logger.error('Embedded Signup: no WABA ID found from any source');
      throw new BadRequestException(
        'No WhatsApp Business Account was shared during signup. Please try again and make sure to complete all steps in the popup.',
      );
    }

    this.logger.log(`Embedded Signup: found WABA ID ${wabaId}`);

    // Step 2 (per Meta docs): Subscribe WABA to app webhooks
    this.logger.log(`Embedded Signup: subscribing WABA ${wabaId} to app webhooks`);
    const subscribeRes = await fetch(
      `${CommunicationService.META_GRAPH_API}/${wabaId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    const subscribeData = await subscribeRes.json() as { success?: boolean; error?: { message: string } };

    if (!subscribeRes.ok || !subscribeData.success) {
      this.logger.warn(`Embedded Signup: webhook subscription warning: ${JSON.stringify(subscribeData)}`);
      // Non-fatal — continue, we can retry later
    }

    // Determine phone number — prefer session info, fall back to API, then env
    let phone: { id: string; display_phone_number: string; verified_name: string; quality_rating: string };

    if (sessionPhoneNumberId) {
      // Fetch details for the specific phone number from session
      this.logger.log(`Embedded Signup: fetching details for phone ${sessionPhoneNumberId}`);
      const phoneRes = await fetch(
        `${CommunicationService.META_GRAPH_API}/${sessionPhoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`,
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      const phoneData = await phoneRes.json() as {
        id?: string; display_phone_number?: string; verified_name?: string; quality_rating?: string;
        error?: { message: string };
      };

      if (phoneRes.ok && phoneData.id) {
        phone = {
          id: phoneData.id,
          display_phone_number: phoneData.display_phone_number || '',
          verified_name: phoneData.verified_name || '',
          quality_rating: phoneData.quality_rating || '',
        };
      } else {
        this.logger.warn(`Embedded Signup: failed to fetch phone details, falling back to WABA listing`);
        phone = await this.fetchFirstPhoneFromWaba(wabaId, userToken);
      }
    } else {
      // Try fetching from WABA first, then fall back to env phone number ID
      try {
        phone = await this.fetchFirstPhoneFromWaba(wabaId, userToken);
      } catch {
        const envPhoneId = this.configService.get<string>('app.whatsapp.phoneNumberId');
        if (envPhoneId) {
          this.logger.log(`Embedded Signup: using phone number ID from environment: ${envPhoneId}`);
          const phoneRes = await fetch(
            `${CommunicationService.META_GRAPH_API}/${envPhoneId}?fields=id,display_phone_number,verified_name,quality_rating`,
            { headers: { Authorization: `Bearer ${userToken}` } },
          );
          const phoneData = await phoneRes.json() as {
            id?: string; display_phone_number?: string; verified_name?: string; quality_rating?: string;
            error?: { message: string };
          };

          if (phoneRes.ok && phoneData.id) {
            phone = {
              id: phoneData.id,
              display_phone_number: phoneData.display_phone_number || '',
              verified_name: phoneData.verified_name || '',
              quality_rating: phoneData.quality_rating || '',
            };
          } else {
            throw new BadRequestException(
              'No phone numbers found. Please add a phone number in Meta Business Suite first.',
            );
          }
        } else {
          throw new BadRequestException(
            'No phone numbers found for the WhatsApp Business Account.',
          );
        }
      }
    }

    this.logger.log(`Embedded Signup: using phone ${phone.display_phone_number} (ID: ${phone.id})`);

    // Step 3 (per Meta docs): Register the customer's phone number
    this.logger.log(`Embedded Signup: registering phone number ${phone.id}`);
    const registerRes = await fetch(
      `${CommunicationService.META_GRAPH_API}/${phone.id}/register`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: '581063',
        }),
      },
    );
    const registerData = await registerRes.json() as { success?: boolean; error?: { message: string } };

    if (!registerRes.ok || !registerData.success) {
      // Non-fatal — phone may already be registered
      this.logger.warn(`Embedded Signup: phone registration note: ${JSON.stringify(registerData)}`);
    }

    // Save to clinic settings (the business token is already long-lived)
    this.logger.log(`Embedded Signup: saving credentials for clinic ${clinicId}`);
    await this.updateClinicSettings(clinicId, {
      enable_whatsapp: true,
      whatsapp_provider: 'meta',
      whatsapp_config: {
        accessToken: encrypt(userToken),
        phoneNumberId: phone.id,
        wabaId,
        displayPhone: phone.display_phone_number,
        verifiedName: phone.verified_name,
        qualityRating: phone.quality_rating,
        connectedAt: new Date().toISOString(),
        connectionMethod: 'embedded_signup',
      },
    }, { skipFeatureCheck: true });

    this.logger.log(`Embedded Signup complete for clinic ${clinicId}: ${phone.display_phone_number}`);

    return {
      success: true,
      waba_id: wabaId,
      phone_number_id: phone.id,
      display_phone: phone.display_phone_number,
      verified_name: phone.verified_name,
      quality_rating: phone.quality_rating,
    };
  }

  private async fetchFirstPhoneFromWaba(wabaId: string, token: string) {
    this.logger.log(`Embedded Signup: fetching phone numbers for WABA ${wabaId}`);
    const phonesRes = await fetch(
      `${CommunicationService.META_GRAPH_API}/${wabaId}/phone_numbers`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const phonesData = await phonesRes.json() as {
      data?: Array<{ id: string; display_phone_number: string; verified_name: string; quality_rating: string }>;
      error?: { message: string };
    };

    if (!phonesRes.ok || !phonesData.data?.length) {
      this.logger.error(`Embedded Signup: no phone numbers found: ${JSON.stringify(phonesData)}`);
      throw new BadRequestException(
        'No phone numbers found for the WhatsApp Business Account. Please add a phone number in Meta Business Suite first.',
      );
    }

    return phonesData.data[0];
  }

  /**
   * Disconnect WhatsApp Business Account from a clinic.
   * Clears saved credentials and disables the WhatsApp channel.
   */
  async disconnectWhatsApp(clinicId: string) {
    this.logger.log(`Disconnecting WhatsApp for clinic ${clinicId}`);

    await this.prisma.clinicCommunicationSettings.update({
      where: { clinic_id: clinicId },
      data: {
        enable_whatsapp: false,
        whatsapp_provider: null,
        whatsapp_config: {},
      },
    });

    // Remove cached provider config
    this.whatsAppProvider.removeClinic(clinicId);

    return { success: true, message: 'WhatsApp disconnected successfully' };
  }
}
