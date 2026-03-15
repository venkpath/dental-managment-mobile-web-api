import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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

    // 5. Resolve message body (from template or direct)
    let body = dto.body || '';
    let subject = dto.subject;
    let html: string | undefined;

    if (dto.template_id) {
      const template = await this.templateService.findOne(clinicId, dto.template_id);
      body = this.renderer.render(template.body, dto.variables || {});
      subject = subject || (template.subject ? this.renderer.render(template.subject, dto.variables || {}) : undefined);
    }

    if (!body) {
      throw new BadRequestException('Message body is required — provide body or template_id');
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

  // ─── Clinic Settings ───

  async getClinicSettings(clinicId: string) {
    return this.getOrCreateClinicSettings(clinicId);
  }

  async updateClinicSettings(clinicId: string, dto: UpdateClinicSettingsDto) {
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

    const [total, byChannel, byStatus] = await Promise.all([
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
    ]);

    return {
      total,
      by_channel: byChannel.map((c) => ({ channel: c.channel, count: c._count })),
      by_status: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  // ─── Test Email ───

  async sendTestEmail(clinicId: string, to: string) {
    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: clinicId },
    });

    if (!settings || !settings.enable_email) {
      throw new BadRequestException('Email is not enabled. Go to Communication → Settings and enable email first.');
    }

    if (!settings.email_config) {
      throw new BadRequestException('Email SMTP config is missing. Go to Communication → Settings and configure SMTP (host, port, user, password).');
    }

    // Auto-fix missing email_provider
    if (!settings.email_provider) {
      await this.prisma.clinicCommunicationSettings.update({
        where: { clinic_id: clinicId },
        data: { email_provider: 'smtp' },
      });
      settings.email_provider = 'smtp';
    }

    // Force re-configure to pick up latest settings
    this.configureProviders(clinicId, settings);

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

  async verifySmtp(clinicId: string) {
    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: clinicId },
    });

    if (!settings || !settings.enable_email || !settings.email_config) {
      return { ok: false, error: 'Email not enabled or SMTP not configured.' };
    }

    if (!settings.email_provider) {
      settings.email_provider = 'smtp';
    }

    this.configureProviders(clinicId, settings);
    const result = await this.emailProvider.verify(clinicId);

    return result;
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
    patient: { phone: string; email: string | null },
    reason: string,
  ) {
    this.logger.debug(`Message skipped for patient ${dto.patient_id}: ${reason}`);

    return this.prisma.communicationMessage.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        template_id: dto.template_id,
        channel: dto.channel,
        category: dto.category || 'transactional',
        subject: dto.subject || '',
        body: dto.body || '',
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
    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: clinicId },
    });

    if (settings) {
      this.configureProviders(clinicId, settings);
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
      const smsConfig = settings.sms_config as SmsProviderConfig;
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
}
