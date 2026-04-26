"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CommunicationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const encryption_util_js_1 = require("../../common/utils/encryption.util.js");
const template_service_js_1 = require("./template.service.js");
const template_renderer_js_1 = require("./template-renderer.js");
const communication_producer_js_1 = require("./communication.producer.js");
const email_provider_js_1 = require("./providers/email.provider.js");
const sms_provider_js_1 = require("./providers/sms.provider.js");
const whatsapp_provider_js_1 = require("./providers/whatsapp.provider.js");
const platform_templates_js_1 = require("./platform-templates.js");
let CommunicationService = class CommunicationService {
    static { CommunicationService_1 = this; }
    prisma;
    configService;
    templateService;
    renderer;
    producer;
    emailProvider;
    smsProvider;
    whatsAppProvider;
    logger = new common_1.Logger(CommunicationService_1.name);
    configurationLocks = new Map();
    constructor(prisma, configService, templateService, renderer, producer, emailProvider, smsProvider, whatsAppProvider) {
        this.prisma = prisma;
        this.configService = configService;
        this.templateService = templateService;
        this.renderer = renderer;
        this.producer = producer;
        this.emailProvider = emailProvider;
        this.smsProvider = smsProvider;
        this.whatsAppProvider = whatsAppProvider;
    }
    async sendMessage(clinicId, dto) {
        await this.ensureProvidersConfigured(clinicId);
        const patient = await this.prisma.patient.findFirst({
            where: { id: dto.patient_id, clinic_id: clinicId },
            include: { communication_preference: true },
        });
        if (!patient) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found`);
        }
        const clinicSettings = await this.getOrCreateClinicSettings(clinicId);
        const channelEnabled = this.isChannelEnabled(clinicSettings, dto.channel);
        if (!channelEnabled) {
            return this.createSkippedMessage(clinicId, dto, patient, 'channel_disabled_clinic');
        }
        const skipReason = this.checkPatientPreferences(patient.communication_preference, dto.channel, dto.category || 'transactional');
        if (skipReason) {
            return this.createSkippedMessage(clinicId, dto, patient, skipReason);
        }
        if (dto.category === 'promotional') {
            const dndSkip = this.checkDndHours(patient.communication_preference, clinicSettings);
            if (dndSkip) {
                const nextWindow = this.getNextValidWindow(patient.communication_preference, clinicSettings);
                dto.scheduled_at = nextWindow.toISOString();
                this.logger.log(`Promotional message delayed to ${nextWindow} due to DND hours`);
            }
        }
        const circuitOpen = await this.isCircuitOpen(clinicId, dto.channel);
        if (circuitOpen) {
            return this.createSkippedMessage(clinicId, dto, patient, 'circuit_breaker_open');
        }
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
        if (dto.channel === 'whatsapp') {
            const quotaExceeded = await this.checkWhatsAppQuota(clinicId);
            if (quotaExceeded) {
                return this.createSkippedMessage(clinicId, dto, patient, 'whatsapp_quota_exceeded');
            }
        }
        let body = dto.body || '';
        let subject = dto.subject;
        let html;
        let dltTemplateId;
        let whatsappTemplateName;
        let whatsappOrderedVars;
        let whatsappLanguage;
        const vars = { ...(dto.variables || {}) };
        if (!vars['name'])
            vars['name'] = vars['patient_first_name'] || vars['patient_name'] || '';
        if (!vars['code'])
            vars['code'] = vars['otp_code'] || '';
        if (dto.template_id) {
            const template = await this.templateService.findOne(clinicId, dto.template_id);
            body = this.renderer.render(template.body, vars);
            subject = subject || (template.subject ? this.renderer.render(template.subject, vars) : undefined);
            dltTemplateId = template.dlt_template_id ?? undefined;
            if (dto.channel === 'whatsapp') {
                whatsappTemplateName = template.template_name;
                whatsappLanguage = template.language || 'en';
                const rawVars = template.variables;
                let templateVarNames = [];
                let templateButtons = [];
                if (Array.isArray(rawVars)) {
                    templateVarNames = rawVars;
                }
                else if (rawVars && typeof rawVars === 'object' && 'body' in rawVars) {
                    const structured = rawVars;
                    templateVarNames = structured.body || [];
                    templateButtons = structured.buttons || [];
                }
                if (templateVarNames.length > 0 && dto.variables) {
                    whatsappOrderedVars = templateVarNames.map((varName) => dto.variables?.[varName] || vars[varName] || '');
                }
                else if (dto.variables && Object.keys(dto.variables).length > 0) {
                    const numberedKeys = Object.keys(dto.variables).filter(k => /^\d+$/.test(k));
                    if (numberedKeys.length > 0) {
                        whatsappOrderedVars = numberedKeys
                            .sort((a, b) => Number(a) - Number(b))
                            .map(k => dto.variables[k]);
                    }
                }
                if (templateButtons.length > 0) {
                    const rawSuffix = dto.metadata?.['button_url_suffix'] || '';
                    const suffix = rawSuffix.replace(/&amp;/g, '&');
                    const btnParams = templateButtons.map(btn => ({
                        type: btn.type,
                        index: btn.index,
                        parameters: [dto.variables?.[`button_${btn.index}`] || suffix || ''],
                    }));
                    dto.metadata = { ...(dto.metadata || {}), whatsapp_button_params: btnParams };
                }
                this.logger.debug(`[WhatsApp] template="${whatsappTemplateName}" lang="${whatsappLanguage}" vars=${whatsappOrderedVars?.length ?? 0} (db_vars=${templateVarNames.length}, dto_vars=${dto.variables ? Object.keys(dto.variables).length : 0}, buttons=${templateButtons.length})`);
            }
        }
        if (dto.channel === 'whatsapp' && !whatsappTemplateName && dto.metadata?.['whatsapp_template_name']) {
            whatsappTemplateName = dto.metadata['whatsapp_template_name'];
            whatsappLanguage = dto.metadata['whatsapp_language'] || 'en';
            if (dto.variables) {
                const numberedKeys = Object.keys(dto.variables).filter(k => /^\d+$/.test(k));
                if (numberedKeys.length > 0) {
                    whatsappOrderedVars = numberedKeys
                        .sort((a, b) => Number(a) - Number(b))
                        .map(k => dto.variables[k]);
                }
            }
        }
        if (dto.channel === 'sms' && !dltTemplateId) {
            const defaultDltId = this.configService.get('app.sms.defaultDltTemplateId');
            if (defaultDltId) {
                dltTemplateId = defaultDltId;
                const fallbackTemplate = await this.prisma.messageTemplate.findFirst({
                    where: { dlt_template_id: defaultDltId, is_active: true, channel: { in: ['sms', 'all'] } },
                });
                if (fallbackTemplate) {
                    body = this.renderer.render(fallbackTemplate.body, vars);
                }
            }
        }
        if (!body) {
            throw new common_1.BadRequestException('Message body is required — provide body or template_id');
        }
        if (dto.category === 'promotional' && dto.channel !== 'in_app') {
            const optOutUrl = this.generateOptOutUrl(dto.patient_id);
            if (dto.channel === 'email') {
                body += `\n\nDon't want to receive these emails? Unsubscribe: ${optOutUrl}`;
            }
            else {
                body += `\nOpt-out: ${optOutUrl}`;
            }
        }
        if (dto.channel === 'email') {
            html = this.renderEmailHtml(body, subject, clinicId);
        }
        else {
            body = this.sanitizeTextBody(body);
        }
        const isDuplicate = await this.checkDeduplication(dto.patient_id, dto.template_id || null, dto.channel);
        if (isDuplicate) {
            return this.createSkippedMessage(clinicId, dto, patient, 'dedup_duplicate');
        }
        const recipient = this.getRecipient(patient, dto.channel);
        if (!recipient) {
            return this.createSkippedMessage(clinicId, dto, patient, 'no_recipient_info');
        }
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
        await this.producer.enqueue({
            messageId: message.id,
            clinicId,
            channel: dto.channel,
            to: recipient,
            subject,
            body,
            html,
            templateId: dto.channel === 'whatsapp' ? whatsappTemplateName : dltTemplateId,
            variables: dto.channel === 'whatsapp' && whatsappOrderedVars
                ? Object.fromEntries(whatsappOrderedVars.map((v, i) => [String(i + 1), v]))
                : undefined,
            language: whatsappLanguage,
            metadata: dto.metadata,
            scheduledAt: dto.scheduled_at,
        });
        this.incrementUsageCounter(clinicId, dto.channel).catch((err) => this.logger.warn(`Failed to increment ${dto.channel} usage counter for clinic ${clinicId}: ${err instanceof Error ? err.message : String(err)}`));
        const isPromotional = (dto.category || 'transactional') === 'promotional';
        const isAlreadyMirrored = dto.metadata?.['mirrored_from_channel'] === 'whatsapp';
        const emailEnabledAtClinic = this.isChannelEnabled(clinicSettings, 'email');
        if (dto.channel === 'whatsapp'
            && patient.email
            && !isPromotional
            && !isAlreadyMirrored
            && emailEnabledAtClinic) {
            try {
                await this.sendMessage(clinicId, {
                    patient_id: dto.patient_id,
                    channel: 'email',
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
            }
            catch (error) {
                const reason = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(`WhatsApp→Email mirror failed for message ${message.id}: ${reason}`);
            }
        }
        this.logger.debug(`Message ${message.id} queued via ${dto.channel} to ${recipient}`);
        return message;
    }
    async findAllMessages(clinicId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = { clinic_id: clinicId };
        if (query.channel)
            where.channel = query.channel;
        if (query.status)
            where.status = query.status;
        if (query.patient_id)
            where.patient_id = query.patient_id;
        if (query.start_date || query.end_date) {
            where.created_at = {};
            if (query.start_date)
                where.created_at.gte = new Date(query.start_date);
            if (query.end_date)
                where.created_at.lte = new Date(query.end_date);
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
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOneMessage(clinicId, id) {
        const message = await this.prisma.communicationMessage.findFirst({
            where: { id, clinic_id: clinicId },
            include: {
                patient: { select: { first_name: true, last_name: true, phone: true, email: true } },
                template: true,
                logs: { orderBy: { created_at: 'desc' } },
            },
        });
        if (!message) {
            throw new common_1.NotFoundException(`Message with ID "${id}" not found`);
        }
        return message;
    }
    async getPatientTimeline(clinicId, patientId, page = 1, limit = 20, channel) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, clinic_id: clinicId },
            select: { id: true, first_name: true, last_name: true },
        });
        if (!patient) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found`);
        }
        const where = {
            clinic_id: clinicId,
            patient_id: patientId,
        };
        if (channel)
            where.channel = channel;
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
            ...(0, paginated_result_interface_js_1.paginate)(data, total, page, limit),
        };
    }
    async createLog(data) {
        const logData = {
            message: { connect: { id: data.message_id } },
            channel: data.channel,
            provider: data.provider,
            provider_message_id: data.provider_message_id,
            status: data.status,
            error_message: data.error_message,
            cost: data.cost,
        };
        if (data.status === 'sent')
            logData.sent_at = new Date();
        if (data.status === 'delivered')
            logData.delivered_at = new Date();
        if (data.status === 'read')
            logData.read_at = new Date();
        if (data.status === 'failed')
            logData.failed_at = new Date();
        return this.prisma.communicationLog.create({ data: logData });
    }
    async updateMessageStatus(messageId, status) {
        return this.prisma.communicationMessage.update({
            where: { id: messageId },
            data: {
                status,
                sent_at: status === 'sent' ? new Date() : undefined,
            },
        });
    }
    async getPatientPreferences(clinicId, patientId) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, clinic_id: clinicId },
        });
        if (!patient) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found`);
        }
        let prefs = await this.prisma.patientCommunicationPreference.findUnique({
            where: { patient_id: patientId },
        });
        if (!prefs) {
            prefs = await this.prisma.patientCommunicationPreference.create({
                data: { patient_id: patientId },
            });
        }
        return prefs;
    }
    async updatePatientPreferences(clinicId, patientId, dto, changedBy = 'clinic_staff', ipAddress) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, clinic_id: clinicId },
        });
        if (!patient) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found`);
        }
        const current = await this.prisma.patientCommunicationPreference.findUnique({
            where: { patient_id: patientId },
        });
        const updated = await this.prisma.patientCommunicationPreference.upsert({
            where: { patient_id: patientId },
            create: { patient_id: patientId, ...dto },
            update: dto,
        });
        if (current) {
            const auditEntries = [];
            const fields = [
                'allow_email', 'allow_sms', 'allow_whatsapp',
                'allow_marketing', 'allow_reminders', 'preferred_channel',
                'quiet_hours_start', 'quiet_hours_end',
            ];
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
    generateOptOutToken(patientId) {
        const secret = this.configService.get('app.jwtSecret') || 'fallback-secret';
        const payload = Buffer.from(JSON.stringify({ pid: patientId, ts: Date.now() })).toString('base64url');
        const sig = (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('base64url');
        return `${payload}.${sig}`;
    }
    generateOptOutUrl(patientId) {
        const token = this.generateOptOutToken(patientId);
        const baseUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3001';
        return `${baseUrl}/unsubscribe?token=${token}`;
    }
    verifyOptOutToken(token) {
        const parts = token.split('.');
        if (parts.length !== 2)
            return null;
        const [payload, sig] = parts;
        const secret = this.configService.get('app.jwtSecret') || 'fallback-secret';
        const expectedSig = (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('base64url');
        if (sig.length !== expectedSig.length)
            return null;
        let diff = 0;
        for (let i = 0; i < sig.length; i++) {
            diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
        }
        if (diff !== 0)
            return null;
        try {
            const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
            if (Date.now() - data.ts > 90 * 24 * 60 * 60 * 1000)
                return null;
            return { patientId: data.pid };
        }
        catch {
            return null;
        }
    }
    async processOptOut(token, channels, ipAddress) {
        const verified = this.verifyOptOutToken(token);
        if (!verified) {
            throw new common_1.BadRequestException('Invalid or expired unsubscribe link');
        }
        const patient = await this.prisma.patient.findUnique({
            where: { id: verified.patientId },
            select: { id: true, first_name: true, clinic_id: true },
        });
        if (!patient) {
            throw new common_1.NotFoundException('Patient not found');
        }
        const updateData = {};
        if (!channels || channels.length === 0) {
            updateData.allow_marketing = false;
        }
        else {
            if (channels.includes('email'))
                updateData.allow_email = false;
            if (channels.includes('sms'))
                updateData.allow_sms = false;
            if (channels.includes('whatsapp'))
                updateData.allow_whatsapp = false;
        }
        const prefs = await this.prisma.patientCommunicationPreference.upsert({
            where: { patient_id: patient.id },
            create: { patient_id: patient.id, ...updateData },
            update: updateData,
        });
        const auditEntries = Object.entries(updateData).map(([field, value]) => ({
            patient_id: patient.id,
            field_changed: field,
            old_value: 'true',
            new_value: String(value),
            changed_by: 'patient_self_service',
            source: 'opt_out_link',
            ip_address: ipAddress,
        }));
        if (auditEntries.length > 0) {
            await this.prisma.consentAuditLog.createMany({ data: auditEntries });
        }
        return {
            message: 'Your communication preferences have been updated',
            patient_name: patient.first_name,
            preferences: prefs,
        };
    }
    async getClinicSettings(clinicId) {
        const [settings, canCustomize] = await Promise.all([
            this.getOrCreateClinicSettings(clinicId),
            this.hasClinicFeature(clinicId, 'CUSTOM_PROVIDER_CONFIG'),
        ]);
        return { ...settings, can_customize_providers: canCustomize };
    }
    async updateClinicSettings(clinicId, dto, options) {
        if (!options?.skipFeatureCheck) {
            const canCustomize = await this.hasClinicFeature(clinicId, 'CUSTOM_PROVIDER_CONFIG');
            if (!canCustomize && (dto.email_config || dto.sms_config || dto.whatsapp_config)) {
                throw new common_1.ForbiddenException('Custom provider configuration is available on Professional and Enterprise plans. ' +
                    'Your clinic currently uses the platform default settings.');
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
        this.emailProvider.removeClinic(clinicId);
        this.smsProvider.removeClinic(clinicId);
        this.whatsAppProvider.removeClinic(clinicId);
        await this.loadAndConfigureProviders(clinicId);
        return settings;
    }
    async getMessageStats(clinicId, startDate, endDate) {
        const where = { clinic_id: clinicId };
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate)
                where.created_at.gte = new Date(startDate);
            if (endDate)
                where.created_at.lte = new Date(endDate);
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
        const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
        const sent = (statusMap['sent'] || 0) + (statusMap['delivered'] || 0);
        const delivered = statusMap['delivered'] || 0;
        const failed = statusMap['failed'] || 0;
        const skipped = statusMap['skipped'] || 0;
        const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0;
        const failureRate = (sent + failed) > 0 ? Math.round((failed / (sent + failed)) * 1000) / 10 : 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        const dailyTrend = await this.prisma.$queryRaw `
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
    async sendTestEmail(clinicId, to) {
        await this.ensureProvidersConfigured(clinicId);
        const settings = await this.prisma.clinicCommunicationSettings.findUnique({
            where: { clinic_id: clinicId },
        });
        if (settings && !settings.enable_email) {
            throw new common_1.BadRequestException('Email is not enabled. Go to Communication → Settings and enable email first.');
        }
        if (!this.emailProvider.isConfigured(clinicId)) {
            throw new common_1.BadRequestException('Email provider not configured. Set SMTP env vars or configure in Communication → Settings (Professional+ plans).');
        }
        const verification = await this.emailProvider.verify(clinicId);
        if (!verification.ok) {
            throw new common_1.BadRequestException(`SMTP connection failed: ${verification.error}. Check host, port, and credentials in Communication → Settings.`);
        }
        const result = await this.emailProvider.send({
            to,
            subject: 'Dental Clinic — SMTP Test Email',
            body: 'This is a test email to verify your SMTP configuration is working correctly.',
            html: this.renderEmailHtml('This is a test email to verify your SMTP configuration is working correctly.\n\nIf you received this, your email setup is working!', 'Dental Clinic — SMTP Test Email', clinicId),
            clinicId,
        });
        if (!result.success) {
            throw new common_1.BadRequestException(`Email sending failed: ${result.error}`);
        }
        return {
            message: 'Test email sent successfully',
            to,
            provider_message_id: result.providerMessageId,
        };
    }
    async sendTestSms(clinicId, to, dltTemplateId, variables) {
        await this.ensureProvidersConfigured(clinicId);
        const settings = await this.prisma.clinicCommunicationSettings.findUnique({
            where: { clinic_id: clinicId },
        });
        if (settings && !settings.enable_sms) {
            throw new common_1.BadRequestException('SMS is not enabled. Go to Communication → Settings and enable SMS first.');
        }
        if (!this.smsProvider.isConfigured(clinicId)) {
            throw new common_1.BadRequestException('SMS provider not configured. Set SMS env vars or configure in Communication → Settings (Professional+ plans).');
        }
        const templateId = dltTemplateId
            || this.configService.get('app.sms.defaultDltTemplateId')
            || undefined;
        if (!templateId) {
            throw new common_1.BadRequestException('DLT template ID is required. Provide dlt_template_id in the request or set SMS_DEFAULT_DLT_TEMPLATE_ID env var.');
        }
        const envBody = this.configService.get('app.sms.dltTemplateBody') || '';
        let testBody = envBody;
        const varValues = Object.values(variables || {});
        for (const val of varValues) {
            testBody = testBody.replace('{#var#}', val);
        }
        testBody = testBody.replace(/\{#var#\}/g, 'test');
        if (!testBody) {
            throw new common_1.BadRequestException('SMS template body is empty. Set SMS_DLT_TEMPLATE_BODY env var.');
        }
        const result = await this.smsProvider.send({
            to,
            body: testBody,
            templateId,
            clinicId,
        });
        if (!result.success) {
            throw new common_1.BadRequestException(`SMS sending failed: ${result.error}`);
        }
        return {
            message: 'Test SMS sent successfully',
            to,
            dlt_template_id: templateId,
            body_sent: testBody,
            provider_message_id: result.providerMessageId,
        };
    }
    async verifySmtp(clinicId) {
        await this.ensureProvidersConfigured(clinicId);
        if (!this.emailProvider.isConfigured(clinicId)) {
            return { ok: false, error: 'Email not configured. Set SMTP env vars or configure in Communication → Settings (Professional+ plans).' };
        }
        const result = await this.emailProvider.verify(clinicId);
        return result;
    }
    async handleChannelFallback(messageId, failedChannel) {
        const message = await this.prisma.communicationMessage.findUnique({
            where: { id: messageId },
        });
        if (!message || !message.patient_id)
            return false;
        const settings = await this.prisma.clinicCommunicationSettings.findUnique({
            where: { clinic_id: message.clinic_id },
        });
        if (!settings?.fallback_chain)
            return false;
        const chain = settings.fallback_chain;
        const currentIndex = chain.indexOf(failedChannel);
        if (currentIndex === -1 || currentIndex >= chain.length - 1)
            return false;
        const nextChannel = chain[currentIndex + 1];
        if (!this.isChannelEnabled(settings, nextChannel))
            return false;
        const patient = await this.prisma.patient.findUnique({
            where: { id: message.patient_id },
            select: { phone: true, email: true },
        });
        if (!patient)
            return false;
        const recipient = this.getRecipient(patient, nextChannel);
        if (!recipient)
            return false;
        await this.prisma.communicationMessage.update({
            where: { id: messageId },
            data: { channel: nextChannel, recipient, status: 'queued' },
        });
        await this.producer.enqueue({
            messageId,
            clinicId: message.clinic_id,
            channel: nextChannel,
            to: recipient,
            subject: message.subject ?? undefined,
            body: message.body,
            metadata: message.metadata ?? undefined,
        });
        this.logger.log(`Fallback: ${messageId} ${failedChannel} → ${nextChannel}`);
        return true;
    }
    async getOrCreateClinicSettings(clinicId) {
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
    isChannelEnabled(settings, channel) {
        switch (channel) {
            case 'email': return settings.enable_email;
            case 'sms': return settings.enable_sms;
            case 'whatsapp': return settings.enable_whatsapp;
            case 'in_app': return true;
            default: return false;
        }
    }
    checkPatientPreferences(prefs, channel, category) {
        if (!prefs)
            return null;
        switch (channel) {
            case 'email':
                if (!prefs.allow_email)
                    return 'patient_email_disabled';
                break;
            case 'sms':
                if (!prefs.allow_sms)
                    return 'patient_sms_disabled';
                break;
            case 'whatsapp':
                if (!prefs.allow_whatsapp)
                    return 'patient_whatsapp_disabled';
                break;
        }
        if (category === 'promotional' && !prefs.allow_marketing) {
            return 'patient_marketing_disabled';
        }
        if (category === 'transactional' && !prefs.allow_reminders) {
            return 'patient_reminders_disabled';
        }
        return null;
    }
    checkDndHours(prefs, clinicSettings) {
        const start = prefs?.quiet_hours_start || clinicSettings?.dnd_start || '21:00';
        const end = prefs?.quiet_hours_end || clinicSettings?.dnd_end || '09:00';
        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
        const startMinutes = this.timeToMinutes(start);
        const endMinutes = this.timeToMinutes(end);
        if (startMinutes > endMinutes) {
            return currentMinutes >= startMinutes || currentMinutes < endMinutes;
        }
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    getNextValidWindow(prefs, clinicSettings) {
        const endTime = prefs?.quiet_hours_end || clinicSettings?.dnd_end || '09:00';
        const [hours, minutes] = endTime.split(':').map(Number);
        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const next = new Date(nowIST);
        next.setHours(hours, minutes, 0, 0);
        if (next <= nowIST) {
            next.setDate(next.getDate() + 1);
        }
        return next;
    }
    async checkDeduplication(patientId, templateId, channel) {
        if (!templateId)
            return false;
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
    getRecipient(patient, channel) {
        switch (channel) {
            case 'email': return patient.email;
            case 'whatsapp': {
                const digits = patient.phone.replace(/[^0-9]/g, '');
                const last10 = digits.slice(-10);
                return `91${last10}`;
            }
            case 'sms': return patient.phone;
            case 'in_app': return patient.phone;
            default: return null;
        }
    }
    async createSkippedMessage(clinicId, dto, patient, reason) {
        this.logger.debug(`Message skipped for patient ${dto.patient_id}: ${reason}`);
        let body = dto.body || '';
        let subject = dto.subject || '';
        if (!body && dto.template_id) {
            try {
                const vars = {
                    ...(dto.variables || {}),
                    patient_name: dto.variables?.['patient_name'] ||
                        `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
                    patient_first_name: dto.variables?.['patient_first_name'] || patient.first_name || '',
                    patient_last_name: dto.variables?.['patient_last_name'] || patient.last_name || '',
                };
                if (!vars['name'])
                    vars['name'] = vars['patient_first_name'] || vars['patient_name'] || '';
                const template = await this.templateService.findOne(clinicId, dto.template_id);
                body = this.renderer.render(template.body, vars);
                subject = dto.subject || (template.subject ? this.renderer.render(template.subject, vars) : '') || '';
            }
            catch (error) {
                this.logger.warn(`Failed to render skipped message body for template ${dto.template_id}: ${error.message}`);
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
    timeToMinutes(time) {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    }
    async ensureProvidersConfigured(clinicId) {
        if (this.emailProvider.isConfigured(clinicId) &&
            this.smsProvider.isConfigured(clinicId) &&
            this.whatsAppProvider.isConfigured(clinicId)) {
            return;
        }
        const existingLock = this.configurationLocks.get(clinicId);
        if (existingLock) {
            await existingLock;
            return;
        }
        const configPromise = this.loadAndConfigureProviders(clinicId);
        this.configurationLocks.set(clinicId, configPromise);
        try {
            await configPromise;
        }
        finally {
            await new Promise(resolve => setImmediate(resolve));
            this.configurationLocks.delete(clinicId);
        }
    }
    async loadAndConfigureProviders(clinicId) {
        const [settings, canCustomize] = await Promise.all([
            this.prisma.clinicCommunicationSettings.findUnique({
                where: { clinic_id: clinicId },
            }),
            this.hasClinicFeature(clinicId, 'CUSTOM_PROVIDER_CONFIG'),
        ]);
        if (settings && canCustomize) {
            this.configureProviders(clinicId, settings);
        }
        if (!this.emailProvider.isConfigured(clinicId)) {
            const envHost = this.configService.get('app.smtp.host');
            const envUser = this.configService.get('app.smtp.user');
            if (envHost && envUser) {
                this.emailProvider.configure(clinicId, {
                    host: envHost,
                    port: this.configService.get('app.smtp.port') || 587,
                    secure: this.configService.get('app.smtp.secure') || false,
                    user: envUser,
                    pass: this.configService.get('app.smtp.pass') || '',
                    from: this.configService.get('app.smtp.from'),
                }, 'smtp');
                this.logger.log(`Email provider configured from env vars for clinic ${clinicId}`);
            }
        }
        if (!this.smsProvider.isConfigured(clinicId)) {
            const envApiKey = this.configService.get('app.sms.apiKey');
            const envSenderId = this.configService.get('app.sms.senderId');
            if (envApiKey && envSenderId) {
                this.smsProvider.configure(clinicId, {
                    apiKey: envApiKey,
                    senderId: envSenderId,
                    dltEntityId: this.configService.get('app.sms.entityId'),
                    route: 'transactional',
                }, 'msg91');
                this.logger.log(`SMS provider configured from env vars for clinic ${clinicId}`);
            }
        }
        if (!this.whatsAppProvider.isConfigured(clinicId)) {
            const envAccessToken = this.configService.get('app.whatsapp.accessToken');
            const envPhoneNumberId = this.configService.get('app.whatsapp.phoneNumberId');
            if (envAccessToken && envPhoneNumberId) {
                this.whatsAppProvider.configure(clinicId, {
                    accessToken: envAccessToken,
                    phoneNumberId: envPhoneNumberId,
                    wabaId: this.configService.get('app.whatsapp.wabaId'),
                }, 'meta');
                this.logger.log(`WhatsApp provider configured from env vars for clinic ${clinicId}`);
            }
        }
    }
    configureProviders(clinicId, settings) {
        if (settings.enable_email && settings.email_config && settings.email_provider) {
            const raw = settings.email_config;
            const emailConfig = {
                host: (raw.host ?? raw.smtp_host),
                port: Number(raw.port ?? raw.smtp_port),
                secure: raw.secure,
                user: (raw.user ?? raw.smtp_user),
                pass: (raw.pass ?? raw.smtp_pass),
                from: (raw.from ?? raw.from_email),
            };
            const hasValidEmailConfig = Boolean(emailConfig.host &&
                emailConfig.user &&
                emailConfig.pass &&
                Number.isFinite(emailConfig.port) &&
                emailConfig.port > 0);
            if (hasValidEmailConfig) {
                this.emailProvider.configure(clinicId, emailConfig, settings.email_provider);
                this.logger.log(`Email provider configured for clinic ${clinicId}: ${settings.email_provider}`);
            }
            else {
                this.logger.warn(`Clinic ${clinicId} has incomplete custom SMTP config; skipping clinic SMTP and using env fallback if available`);
            }
        }
        if (settings.enable_sms && settings.sms_config && settings.sms_provider) {
            const raw = settings.sms_config;
            const smsConfig = {
                apiKey: (raw.apiKey ?? raw.api_key),
                senderId: (raw.senderId ?? raw.sender_id),
                dltEntityId: (raw.dltEntityId ?? raw.dlt_entity_id),
                route: raw.route ?? 'transactional',
            };
            this.smsProvider.configure(clinicId, smsConfig, settings.sms_provider);
            this.logger.log(`SMS provider configured for clinic ${clinicId}: ${settings.sms_provider}`);
        }
        if (settings.enable_whatsapp && settings.whatsapp_config && settings.whatsapp_provider) {
            const raw = settings.whatsapp_config;
            const rawToken = (raw.accessToken ?? raw.access_token);
            try {
                const waConfig = {
                    accessToken: (0, encryption_util_js_1.decrypt)(rawToken),
                    phoneNumberId: (raw.phoneNumberId ?? raw.phone_number_id),
                    wabaId: (raw.wabaId ?? raw.waba_id),
                };
                this.whatsAppProvider.configure(clinicId, waConfig, settings.whatsapp_provider);
                this.logger.log(`WhatsApp provider configured for clinic ${clinicId}: ${settings.whatsapp_provider}`);
            }
            catch (decryptError) {
                this.logger.error(`WhatsApp provider config failed for clinic ${clinicId}: decryption error — ${decryptError instanceof Error ? decryptError.message : String(decryptError)}. ` +
                    `Check that encryption keys match and token is valid.`);
            }
        }
    }
    sanitizeTextBody(body) {
        return body
            .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .trim();
    }
    renderEmailHtml(body, subject, _clinicId) {
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
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    static CIRCUIT_BREAKER_WINDOW = 100;
    static CIRCUIT_BREAKER_THRESHOLD = 0.5;
    static CIRCUIT_BREAKER_MIN_SAMPLE = 20;
    static CIRCUIT_BREAKER_LOOKBACK_MS = 60 * 60 * 1000;
    async getCircuitBreakerStatus(clinicId) {
        const channels = ['email', 'sms', 'whatsapp'];
        const result = {};
        const since = new Date(Date.now() - CommunicationService_1.CIRCUIT_BREAKER_LOOKBACK_MS);
        for (const channel of channels) {
            const recentMessages = await this.prisma.communicationMessage.findMany({
                where: {
                    clinic_id: clinicId,
                    channel,
                    status: { in: ['sent', 'delivered', 'failed'] },
                    created_at: { gte: since },
                },
                orderBy: { created_at: 'desc' },
                take: CommunicationService_1.CIRCUIT_BREAKER_WINDOW,
                select: { status: true },
            });
            const failedCount = recentMessages.filter((m) => m.status === 'failed').length;
            const failureRate = recentMessages.length > 0 ? failedCount / recentMessages.length : 0;
            result[channel] = {
                is_open: recentMessages.length >= CommunicationService_1.CIRCUIT_BREAKER_MIN_SAMPLE && failureRate >= CommunicationService_1.CIRCUIT_BREAKER_THRESHOLD,
                failure_rate: Math.round(failureRate * 1000) / 10,
                sample_size: recentMessages.length,
            };
        }
        return result;
    }
    async isCircuitOpen(clinicId, channel) {
        const since = new Date(Date.now() - CommunicationService_1.CIRCUIT_BREAKER_LOOKBACK_MS);
        const recentMessages = await this.prisma.communicationMessage.findMany({
            where: {
                clinic_id: clinicId,
                channel,
                status: { in: ['sent', 'delivered', 'failed'] },
                created_at: { gte: since },
            },
            orderBy: { created_at: 'desc' },
            take: CommunicationService_1.CIRCUIT_BREAKER_WINDOW,
            select: { status: true },
        });
        if (recentMessages.length < CommunicationService_1.CIRCUIT_BREAKER_MIN_SAMPLE)
            return false;
        const failedCount = recentMessages.filter((m) => m.status === 'failed').length;
        const failureRate = failedCount / recentMessages.length;
        if (failureRate >= CommunicationService_1.CIRCUIT_BREAKER_THRESHOLD) {
            this.logger.warn(`Circuit breaker OPEN for clinic ${clinicId} channel ${channel}: ` +
                `${failedCount}/${recentMessages.length} failed (${(failureRate * 100).toFixed(1)}%)`);
            return true;
        }
        return false;
    }
    async hasClinicFeature(clinicId, featureKey) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { plan_id: true },
        });
        if (!clinic?.plan_id)
            return false;
        const planFeature = await this.prisma.planFeature.findFirst({
            where: {
                plan_id: clinic.plan_id,
                feature: { key: featureKey },
                is_enabled: true,
            },
        });
        return !!planFeature;
    }
    async getUsage(clinicId) {
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
            throw new common_1.NotFoundException(`Clinic ${clinicId} not found`);
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
    async checkWhatsAppQuota(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                id: true,
                has_own_waba: true,
                plan_id: true,
            },
        });
        if (!clinic)
            return false;
        if (clinic.has_own_waba)
            return false;
        if (!clinic.plan_id)
            return false;
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
    async incrementUsageCounter(clinicId, channel) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let column;
        if (channel === 'whatsapp') {
            column = 'whatsapp_sent';
        }
        else if (channel === 'sms') {
            column = 'sms_sent';
        }
        else if (channel === 'email') {
            column = 'email_sent';
        }
        else {
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
    async handleSmsDeliveryWebhook(payload) {
        const requestId = payload['request_id'];
        if (!requestId) {
            this.logger.warn('SMS webhook: missing request_id');
            return { processed: 0 };
        }
        const statusMap = {
            '1': 'delivered',
            '2': 'failed',
            '3': 'delivered',
            '5': 'sent',
            '9': 'failed',
            '16': 'failed',
            '17': 'failed',
            '25': 'sent',
            '26': 'failed',
            delivered: 'delivered',
            failed: 'failed',
            sent: 'sent',
            bounced: 'failed',
        };
        let processed = 0;
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
            const updateData = { status: internalStatus };
            if (internalStatus === 'delivered')
                updateData['delivered_at'] = new Date();
            if (internalStatus === 'failed') {
                updateData['failed_at'] = new Date();
                updateData['error_message'] = (payload['desc'] || payload['description'] || 'Delivery failed');
            }
            await this.prisma.communicationLog.update({
                where: { id: log.id },
                data: updateData,
            });
            await this.updateMessageStatus(log.message.id, internalStatus);
            processed++;
        }
        this.logger.log(`SMS webhook processed: request_id=${requestId}, status=${internalStatus}, count=${processed}`);
        return { processed, status: internalStatus };
    }
    async handleWhatsAppWebhook(payload) {
        if (payload['object'] !== 'whatsapp_business_account') {
            this.logger.warn(`WhatsApp webhook: unexpected object type "${payload['object']}"`);
            return { processed: 0 };
        }
        const entries = payload['entry'];
        if (!entries || entries.length === 0)
            return { processed: 0 };
        let totalProcessed = 0;
        for (const entry of entries) {
            const changes = entry['changes'];
            if (!changes)
                continue;
            for (const change of changes) {
                if (change['field'] !== 'messages')
                    continue;
                const value = change['value'];
                if (!value)
                    continue;
                const statuses = value['statuses'];
                if (statuses) {
                    for (const status of statuses) {
                        const processed = await this.processMetaStatusUpdate(status);
                        totalProcessed += processed;
                    }
                }
                const messages = value['messages'];
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
    async processMetaStatusUpdate(status) {
        const providerMessageId = status['id'];
        const statusType = status['status'];
        const recipientId = status['recipient_id'];
        if (!providerMessageId)
            return 0;
        const statusMap = {
            sent: 'sent',
            delivered: 'delivered',
            read: 'read',
            failed: 'failed',
        };
        const internalStatus = statusMap[statusType];
        if (!internalStatus)
            return 0;
        let processed = 0;
        const logs = await this.prisma.communicationLog.findMany({
            where: { provider_message_id: providerMessageId, channel: 'whatsapp' },
            include: { message: { select: { id: true } } },
        });
        for (const log of logs) {
            const updateData = { status: internalStatus };
            if (internalStatus === 'delivered')
                updateData['delivered_at'] = new Date();
            if (internalStatus === 'read')
                updateData['read_at'] = new Date();
            if (internalStatus === 'failed') {
                updateData['failed_at'] = new Date();
                const errors = status['errors'];
                const errorMsg = errors?.[0]?.['title'] || 'Delivery failed';
                updateData['error_message'] = errorMsg;
            }
            await this.prisma.communicationLog.update({
                where: { id: log.id },
                data: updateData,
            });
            await this.updateMessageStatus(log.message.id, internalStatus);
            processed++;
        }
        if (processed === 0) {
            const directMsg = await this.prisma.communicationMessage.findFirst({
                where: { wa_message_id: providerMessageId },
                select: { id: true, status: true },
            });
            if (directMsg) {
                const statusPriority = { failed: 0, sent: 1, delivered: 2, read: 3 };
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
        if (processed === 0) {
            const platformMsg = await this.prisma.platformMessage.findFirst({
                where: { wa_message_id: providerMessageId },
                select: { id: true, status: true },
            });
            if (platformMsg) {
                const statusPriority = { failed: 0, sent: 1, delivered: 2, read: 3 };
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
    async storePlatformInboundMessage(msg, from, msgType, text, waMessageId, phoneNumberId) {
        if (waMessageId) {
            const existing = await this.prisma.platformMessage.findFirst({
                where: { wa_message_id: waMessageId },
                select: { id: true },
            });
            if (existing)
                return;
        }
        const mediaData = { type: msgType, phone_number_id: phoneNumberId };
        if (['image', 'document', 'audio', 'video'].includes(msgType)) {
            const mediaObj = msg[msgType];
            if (mediaObj) {
                mediaData['media_id'] = mediaObj['id'];
                mediaData['mime_type'] = mediaObj['mime_type'];
                if (mediaObj['caption'])
                    mediaData['caption'] = mediaObj['caption'];
                if (mediaObj['filename'])
                    mediaData['filename'] = mediaObj['filename'];
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
    async processMetaIncomingMessage(msg, value) {
        const from = msg['from'];
        const msgType = msg['type'];
        const waMessageId = msg['id'];
        let text = '';
        if (msgType === 'text') {
            const textObj = msg['text'];
            text = textObj?.['body'] || '';
        }
        else if (msgType === 'button') {
            const buttonObj = msg['button'];
            text = buttonObj?.['text'] || `[Button: ${buttonObj?.['payload'] || ''}]`;
        }
        else if (msgType === 'interactive') {
            const interactive = msg['interactive'];
            const buttonReply = interactive?.['button_reply'];
            text = buttonReply?.['title'] || '';
        }
        else if (msgType === 'image') {
            text = '[Image]';
        }
        else if (msgType === 'audio') {
            text = '[Audio]';
        }
        else if (msgType === 'document') {
            text = '[Document]';
        }
        else if (msgType === 'location') {
            text = '[Location]';
        }
        else {
            text = `[${msgType}]`;
        }
        this.logger.log(`WhatsApp incoming message from ${from} (type: ${msgType}): ${text.substring(0, 50)}`);
        const metadata = value['metadata'];
        const phoneNumberId = metadata?.['phone_number_id'];
        const platformPhoneNumberId = this.configService.get('app.whatsapp.phoneNumberId');
        if (phoneNumberId && platformPhoneNumberId && phoneNumberId === platformPhoneNumberId) {
            await this.storePlatformInboundMessage(msg, from, msgType, text, waMessageId, phoneNumberId);
            return;
        }
        let clinicId = null;
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
            }
            catch {
                const allSettings = await this.prisma.clinicCommunicationSettings.findMany({
                    where: { enable_whatsapp: true },
                    select: { clinic_id: true, whatsapp_config: true },
                });
                for (const s of allSettings) {
                    const cfg = s.whatsapp_config;
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
        if (waMessageId) {
            const existing = await this.prisma.communicationMessage.findFirst({
                where: { wa_message_id: waMessageId },
                select: { id: true },
            });
            if (existing)
                return;
        }
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
        const mediaData = { type: msgType, phone_number_id: phoneNumberId };
        if (['image', 'document', 'audio', 'video'].includes(msgType)) {
            const mediaObj = msg[msgType];
            if (mediaObj) {
                mediaData['media_id'] = mediaObj['id'];
                mediaData['mime_type'] = mediaObj['mime_type'];
                if (mediaObj['caption'])
                    mediaData['caption'] = mediaObj['caption'];
                if (mediaObj['filename'])
                    mediaData['filename'] = mediaObj['filename'];
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
        this.whatsAppProvider.trackIncomingMessage(clinicId, from);
        this.logger.log(`WhatsApp inbound stored: clinic=${clinicId}, from=${from}, patient=${patient?.id ?? 'unknown'}`);
    }
    async getInboxConversations(clinicId, page = 1, limit = 30) {
        const offset = (page - 1) * limit;
        const rows = await this.prisma.$queryRaw `
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
    async getConversationMessages(clinicId, phone, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const digitsOnly = phone.replace(/[^0-9]/g, '');
        const last10 = digitsOnly.slice(-10);
        const phoneVariants = [...new Set([phone, digitsOnly, last10, `91${last10}`, `+91${last10}`])];
        const whereClause = { clinic_id: clinicId, channel: 'whatsapp', recipient: { in: phoneVariants } };
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
            this.queueMetaReadReceipts(clinicId, unreadInbound.map((m) => m.wa_message_id));
        }
        return {
            data: messages,
            meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
        };
    }
    async sendInboxReply(clinicId, phone, body) {
        const digitsOnly = phone.replace(/[^0-9]/g, '');
        const last10 = digitsOnly.slice(-10);
        const normalizedPhone = `91${last10}`;
        const phoneVariants = [...new Set([normalizedPhone, last10, `+91${last10}`, phone])];
        const patient = await this.prisma.patient.findFirst({
            where: {
                clinic_id: clinicId,
                OR: phoneVariants.map((p) => ({ phone: p })),
            },
            select: { id: true },
        });
        const lastInbound = await this.prisma.communicationMessage.findFirst({
            where: { clinic_id: clinicId, channel: 'whatsapp', recipient: { in: phoneVariants }, direction: 'inbound' },
            orderBy: { created_at: 'desc' },
            select: { created_at: true },
        });
        const withinWindow = lastInbound
            ? (Date.now() - lastInbound.created_at.getTime()) < 24 * 60 * 60 * 1000
            : false;
        if (!withinWindow) {
            throw new common_1.BadRequestException('Cannot send free-form message — no patient reply within last 24 hours. Use a template instead.');
        }
        await this.ensureProvidersConfigured(clinicId);
        const result = await this.whatsAppProvider.sendFreeText(clinicId, normalizedPhone, body);
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
    queueMetaReadReceipts(clinicId, waMessageIds) {
        setImmediate(async () => {
            let retryCount = 0;
            const maxRetries = 3;
            while (retryCount < maxRetries) {
                try {
                    await this.sendMetaReadReceipts(clinicId, waMessageIds);
                    this.logger.debug(`Read receipts sent successfully after ${retryCount} retries`);
                    return;
                }
                catch (err) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        const delay = Math.pow(2, retryCount) * 1000;
                        this.logger.warn(`Read receipts failed (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    else {
                        this.logger.error(`Failed to send read receipts after ${maxRetries} attempts. Patients won't see blue ticks. ` +
                            `Error: ${err instanceof Error ? err.message : String(err)}`);
                    }
                }
            }
        });
    }
    async sendMetaReadReceipts(clinicId, waMessageIds) {
        await this.ensureProvidersConfigured(clinicId);
        const settings = await this.prisma.clinicCommunicationSettings.findUnique({
            where: { clinic_id: clinicId },
            select: { whatsapp_config: true },
        });
        const cfg = settings?.whatsapp_config;
        if (!cfg?.accessToken || !cfg?.phoneNumberId)
            return;
        let token;
        try {
            token = (0, encryption_util_js_1.decrypt)(cfg.accessToken);
        }
        catch {
            token = cfg.accessToken;
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
            }
            catch {
            }
        }
    }
    async checkNdncStatus(phone) {
        const ndncApiUrl = this.configService.get('app.ndnc.apiUrl');
        const ndncApiKey = this.configService.get('app.ndnc.apiKey');
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
            const data = await response.json();
            return {
                is_ndnc: !!data.is_ndnc,
                checked: true,
                message: data.is_ndnc ? 'Number is on NDNC registry' : 'Number is not on NDNC registry',
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`NDNC check error for ${cleanPhone}: ${msg}`);
            return { is_ndnc: false, checked: false, message: `NDNC check error: ${msg}` };
        }
    }
    async submitWhatsAppTemplate(clinicId, templateData) {
        await this.ensureProvidersConfigured(clinicId);
        const result = await this.whatsAppProvider.submitTemplate(clinicId, templateData);
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
                    },
                });
            }
            else {
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
                    },
                });
            }
        }
        return result;
    }
    async syncWhatsAppTemplates(clinicId) {
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
                if (platform_templates_js_1.PLATFORM_TEMPLATE_NAMES.includes(metaTemplate.name)) {
                    skipped++;
                    continue;
                }
                const bodyComponent = metaTemplate.components.find((c) => c.type?.toUpperCase() === 'BODY');
                const bodyText = bodyComponent?.text || '';
                const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
                const variables = varMatches.map((m) => m.replace(/[{}]/g, ''));
                const buttonsComponent = metaTemplate.components.find((c) => c.type?.toUpperCase() === 'BUTTONS');
                const urlButtons = [];
                if (buttonsComponent) {
                    const buttons = (buttonsComponent.buttons || []);
                    buttons.forEach((btn, idx) => {
                        if (btn.type?.toUpperCase() === 'URL' && btn.url) {
                            const btnUrl = btn.url;
                            if (/\{\{\d+\}\}/.test(btnUrl)) {
                                urlButtons.push({ index: idx, url: btnUrl });
                            }
                        }
                    });
                }
                const categoryMap = {
                    MARKETING: 'campaign',
                    UTILITY: 'transactional',
                    AUTHENTICATION: 'transactional',
                };
                const category = categoryMap[metaTemplate.category] || 'transactional';
                const statusMap = {
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
                const existing = await this.prisma.messageTemplate.findFirst({
                    where: {
                        clinic_id: clinicId,
                        template_name: metaTemplate.name,
                        channel: 'whatsapp',
                        language: metaTemplate.language,
                    },
                });
                const variablesJson = urlButtons.length > 0
                    ? { body: variables, buttons: urlButtons.map(b => ({ type: 'url', index: b.index })) }
                    : (variables.length > 0 ? variables : undefined);
                if (existing) {
                    await this.prisma.messageTemplate.update({
                        where: { id: existing.id },
                        data: {
                            whatsapp_template_status: whatsappStatus,
                            is_active: metaTemplate.status === 'APPROVED',
                            body: bodyText || existing.body,
                            meta_template_id: metaTemplate.id,
                            ...(variablesJson !== undefined ? { variables: variablesJson } : {}),
                        },
                    });
                    updated++;
                }
                else {
                    await this.prisma.messageTemplate.create({
                        data: {
                            clinic_id: clinicId,
                            channel: 'whatsapp',
                            category,
                            template_name: metaTemplate.name,
                            body: bodyText || `[Template: ${metaTemplate.name}]`,
                            ...(variablesJson !== undefined ? { variables: variablesJson } : {}),
                            language: metaTemplate.language,
                            whatsapp_template_status: whatsappStatus,
                            is_active: metaTemplate.status === 'APPROVED',
                            meta_template_id: metaTemplate.id,
                        },
                    });
                    created++;
                }
            }
            catch (e) {
                this.logger.error(`Sync failed for template "${metaTemplate.name}": ${e.message}`);
                skipped++;
            }
        }
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
            this.logger.log(`Deleted ${deleted} orphaned WhatsApp templates not found in Meta: ${orphaned.map((o) => o.template_name).join(', ')}`);
        }
        this.logger.log(`WhatsApp template sync for clinic ${clinicId}: ${created} created, ${updated} updated, ${deleted} deleted, ${skipped} skipped (${result.templates.length} total from Meta)`);
        return {
            success: true,
            total_from_meta: result.templates.length,
            created,
            updated,
            deleted,
            skipped,
        };
    }
    async getWhatsAppTemplateStatus(clinicId, templateName) {
        await this.ensureProvidersConfigured(clinicId);
        const status = await this.whatsAppProvider.getTemplateStatus(clinicId, templateName);
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
    async deleteWhatsAppTemplateFromMeta(clinicId, localTemplateId) {
        await this.ensureProvidersConfigured(clinicId);
        const template = await this.prisma.messageTemplate.findFirst({
            where: { id: localTemplateId, clinic_id: clinicId, channel: 'whatsapp' },
        });
        if (!template) {
            throw new Error(`WhatsApp template "${localTemplateId}" not found for this clinic`);
        }
        const metaResult = await this.whatsAppProvider.deleteTemplateFromMeta(clinicId, template.template_name);
        if (!metaResult.success) {
            return { success: false, error: metaResult.error, local_deleted: false };
        }
        await this.prisma.messageTemplate.delete({ where: { id: localTemplateId } });
        return { success: true, local_deleted: true };
    }
    async editWhatsAppTemplateOnMeta(clinicId, localTemplateId, updateData) {
        await this.ensureProvidersConfigured(clinicId);
        const template = await this.prisma.messageTemplate.findFirst({
            where: { id: localTemplateId, clinic_id: clinicId, channel: 'whatsapp' },
        });
        if (!template) {
            throw new Error(`WhatsApp template "${localTemplateId}" not found for this clinic`);
        }
        const metaTemplateId = template.meta_template_id;
        if (!metaTemplateId) {
            return {
                success: false,
                error: 'No Meta template ID stored for this template. Run a sync first.',
            };
        }
        if (template.whatsapp_template_status !== 'rejected') {
            return {
                success: false,
                error: 'Only REJECTED templates can be edited on Meta. Current status: ' + template.whatsapp_template_status,
            };
        }
        const metaResult = await this.whatsAppProvider.editTemplateOnMeta(clinicId, metaTemplateId, updateData);
        if (!metaResult.success) {
            return { success: false, error: metaResult.error };
        }
        await this.prisma.messageTemplate.update({
            where: { id: localTemplateId },
            data: {
                body: updateData.body,
                whatsapp_template_status: 'submitted',
                is_active: false,
                ...(updateData.header ? { subject: updateData.header } : {}),
            },
        });
        return { success: true };
    }
    renderRichEmailHtml(body, subject, options) {
        const clinicName = options?.clinicName || 'Smart Dental Desk';
        const preheader = options?.preheader || '';
        const processedBody = body
            .split('\n')
            .map(line => {
            const trimmed = line.trim();
            if (!trimmed)
                return '';
            if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
                return `<li style="margin: 4px 0; line-height: 1.6;">${this.escapeHtml(trimmed.substring(2))}</li>`;
            }
            return `<p style="margin: 0 0 12px 0; line-height: 1.6;">${this.escapeHtml(trimmed)}</p>`;
        })
            .join('\n')
            .replace(/(<li[^>]*>.*<\/li>\n?)+/g, match => `<ul style="margin: 12px 0; padding-left: 20px;">${match}</ul>`);
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
    static META_GRAPH_API = 'https://graph.facebook.com/v21.0';
    async completeWhatsAppEmbeddedSignup(clinicId, code, accessToken, sessionPhoneNumberId, sessionWabaId, _redirectUri) {
        const appId = this.configService.get('app.facebook.appId');
        const appSecret = this.configService.get('app.facebook.appSecret');
        if (!appId || !appSecret) {
            throw new common_1.InternalServerErrorException('Facebook App ID and App Secret must be configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.');
        }
        let userToken;
        if (accessToken) {
            this.logger.log(`Embedded Signup: using direct access token for clinic ${clinicId}`);
            userToken = accessToken;
        }
        if (!userToken && code) {
            this.logger.log(`Embedded Signup: attempting code exchange for clinic ${clinicId}`);
            try {
                const tokenUrl = new URL(`${CommunicationService_1.META_GRAPH_API}/oauth/access_token`);
                tokenUrl.searchParams.set('client_id', appId);
                tokenUrl.searchParams.set('client_secret', appSecret);
                tokenUrl.searchParams.set('code', code);
                const tokenRes = await fetch(tokenUrl.toString());
                const tokenData = await tokenRes.json();
                if (tokenRes.ok && tokenData.access_token) {
                    this.logger.log(`Embedded Signup: code exchange successful for clinic ${clinicId}`);
                    userToken = tokenData.access_token;
                }
                else {
                    this.logger.warn(`Embedded Signup: code exchange failed (expected with JS SDK popup): ${JSON.stringify(tokenData)}`);
                }
            }
            catch (err) {
                this.logger.warn(`Embedded Signup: code exchange error: ${err}`);
            }
        }
        if (!userToken) {
            const systemUserToken = this.configService.get('app.whatsapp.accessToken');
            if (systemUserToken) {
                this.logger.log(`Embedded Signup: using System User token from environment for clinic ${clinicId}`);
                userToken = systemUserToken;
            }
            else {
                throw new common_1.BadRequestException('Could not obtain access token. Please ensure WHATSAPP_ACCESS_TOKEN is configured.');
            }
        }
        let wabaId = sessionWabaId;
        if (!wabaId) {
            this.logger.log('Embedded Signup: no WABA from session, trying debug_token');
            try {
                const debugUrl = new URL(`${CommunicationService_1.META_GRAPH_API}/debug_token`);
                debugUrl.searchParams.set('input_token', userToken);
                debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);
                const debugRes = await fetch(debugUrl.toString());
                const debugData = await debugRes.json();
                if (debugRes.ok) {
                    const wabaScopes = debugData.data?.granular_scopes?.find((s) => s.permission === 'whatsapp_business_management');
                    wabaId = wabaScopes?.target_ids?.[0];
                }
                else {
                    this.logger.warn(`Embedded Signup debug_token failed: ${JSON.stringify(debugData)}`);
                }
            }
            catch (err) {
                this.logger.warn(`Embedded Signup debug_token error: ${err}`);
            }
        }
        if (!wabaId) {
            const envWabaId = this.configService.get('app.whatsapp.wabaId');
            if (envWabaId) {
                this.logger.log(`Embedded Signup: using WABA ID from environment: ${envWabaId}`);
                wabaId = envWabaId;
            }
        }
        if (!wabaId) {
            this.logger.error('Embedded Signup: no WABA ID found from any source');
            throw new common_1.BadRequestException('No WhatsApp Business Account was shared during signup. Please try again and make sure to complete all steps in the popup.');
        }
        this.logger.log(`Embedded Signup: found WABA ID ${wabaId}`);
        this.logger.log(`Embedded Signup: subscribing WABA ${wabaId} to app webhooks`);
        const subscribeRes = await fetch(`${CommunicationService_1.META_GRAPH_API}/${wabaId}/subscribed_apps`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            },
        });
        const subscribeData = await subscribeRes.json();
        if (!subscribeRes.ok || !subscribeData.success) {
            this.logger.warn(`Embedded Signup: webhook subscription warning: ${JSON.stringify(subscribeData)}`);
        }
        let phone;
        if (sessionPhoneNumberId) {
            this.logger.log(`Embedded Signup: fetching details for phone ${sessionPhoneNumberId}`);
            const phoneRes = await fetch(`${CommunicationService_1.META_GRAPH_API}/${sessionPhoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`, { headers: { Authorization: `Bearer ${userToken}` } });
            const phoneData = await phoneRes.json();
            if (phoneRes.ok && phoneData.id) {
                phone = {
                    id: phoneData.id,
                    display_phone_number: phoneData.display_phone_number || '',
                    verified_name: phoneData.verified_name || '',
                    quality_rating: phoneData.quality_rating || '',
                };
            }
            else {
                this.logger.warn(`Embedded Signup: failed to fetch phone details, falling back to WABA listing`);
                phone = await this.fetchFirstPhoneFromWaba(wabaId, userToken);
            }
        }
        else {
            try {
                phone = await this.fetchFirstPhoneFromWaba(wabaId, userToken);
            }
            catch {
                const envPhoneId = this.configService.get('app.whatsapp.phoneNumberId');
                if (envPhoneId) {
                    this.logger.log(`Embedded Signup: using phone number ID from environment: ${envPhoneId}`);
                    const phoneRes = await fetch(`${CommunicationService_1.META_GRAPH_API}/${envPhoneId}?fields=id,display_phone_number,verified_name,quality_rating`, { headers: { Authorization: `Bearer ${userToken}` } });
                    const phoneData = await phoneRes.json();
                    if (phoneRes.ok && phoneData.id) {
                        phone = {
                            id: phoneData.id,
                            display_phone_number: phoneData.display_phone_number || '',
                            verified_name: phoneData.verified_name || '',
                            quality_rating: phoneData.quality_rating || '',
                        };
                    }
                    else {
                        throw new common_1.BadRequestException('No phone numbers found. Please add a phone number in Meta Business Suite first.');
                    }
                }
                else {
                    throw new common_1.BadRequestException('No phone numbers found for the WhatsApp Business Account.');
                }
            }
        }
        this.logger.log(`Embedded Signup: using phone ${phone.display_phone_number} (ID: ${phone.id})`);
        this.logger.log(`Embedded Signup: registering phone number ${phone.id}`);
        const registerRes = await fetch(`${CommunicationService_1.META_GRAPH_API}/${phone.id}/register`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                pin: '581063',
            }),
        });
        const registerData = await registerRes.json();
        if (!registerRes.ok || !registerData.success) {
            this.logger.warn(`Embedded Signup: phone registration note: ${JSON.stringify(registerData)}`);
        }
        this.logger.log(`Embedded Signup: saving credentials for clinic ${clinicId}`);
        await this.updateClinicSettings(clinicId, {
            enable_whatsapp: true,
            whatsapp_provider: 'meta',
            whatsapp_config: {
                accessToken: (0, encryption_util_js_1.encrypt)(userToken),
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
    async fetchFirstPhoneFromWaba(wabaId, token) {
        this.logger.log(`Embedded Signup: fetching phone numbers for WABA ${wabaId}`);
        const phonesRes = await fetch(`${CommunicationService_1.META_GRAPH_API}/${wabaId}/phone_numbers`, { headers: { Authorization: `Bearer ${token}` } });
        const phonesData = await phonesRes.json();
        if (!phonesRes.ok || !phonesData.data?.length) {
            this.logger.error(`Embedded Signup: no phone numbers found: ${JSON.stringify(phonesData)}`);
            throw new common_1.BadRequestException('No phone numbers found for the WhatsApp Business Account. Please add a phone number in Meta Business Suite first.');
        }
        return phonesData.data[0];
    }
    async disconnectWhatsApp(clinicId) {
        this.logger.log(`Disconnecting WhatsApp for clinic ${clinicId}`);
        await this.prisma.clinicCommunicationSettings.update({
            where: { clinic_id: clinicId },
            data: {
                enable_whatsapp: false,
                whatsapp_provider: null,
                whatsapp_config: {},
            },
        });
        this.whatsAppProvider.removeClinic(clinicId);
        return { success: true, message: 'WhatsApp disconnected successfully' };
    }
};
exports.CommunicationService = CommunicationService;
exports.CommunicationService = CommunicationService = CommunicationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService,
        template_service_js_1.TemplateService,
        template_renderer_js_1.TemplateRenderer,
        communication_producer_js_1.CommunicationProducer,
        email_provider_js_1.EmailProvider,
        sms_provider_js_1.SmsProvider,
        whatsapp_provider_js_1.WhatsAppProvider])
], CommunicationService);
//# sourceMappingURL=communication.service.js.map