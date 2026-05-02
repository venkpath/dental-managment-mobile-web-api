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
var ConsentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const ai_service_js_1 = require("../ai/ai.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const consent_pdf_service_js_1 = require("./consent-pdf.service.js");
const default_templates_js_1 = require("./default-templates.js");
const consent_ai_prompt_js_1 = require("./consent-ai.prompt.js");
let ConsentService = ConsentService_1 = class ConsentService {
    prisma;
    s3;
    pdfService;
    aiService;
    config;
    communication;
    logger = new common_1.Logger(ConsentService_1.name);
    constructor(prisma, s3, pdfService, aiService, config, communication) {
        this.prisma = prisma;
        this.s3 = s3;
        this.pdfService = pdfService;
        this.aiService = aiService;
        this.config = config;
        this.communication = communication;
    }
    async listTemplates(clinicId, query) {
        return this.prisma.consentTemplate.findMany({
            where: {
                clinic_id: clinicId,
                ...(query.language ? { language: query.language } : {}),
                ...(query.code ? { code: query.code } : {}),
                ...(query.is_active !== undefined ? { is_active: query.is_active } : {}),
            },
            orderBy: [{ is_default: 'desc' }, { code: 'asc' }, { language: 'asc' }],
        });
    }
    async getTemplate(clinicId, id) {
        const t = await this.prisma.consentTemplate.findUnique({ where: { id } });
        if (!t || t.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Consent template not found');
        return t;
    }
    async createTemplate(clinicId, userId, dto) {
        return this.prisma.consentTemplate.create({
            data: {
                clinic_id: clinicId,
                code: dto.code,
                language: dto.language,
                title: dto.title,
                body: dto.body,
                is_default: dto.is_default ?? false,
                is_active: dto.is_active ?? true,
                created_by: userId,
            },
        });
    }
    async updateTemplate(clinicId, id, dto) {
        await this.getTemplate(clinicId, id);
        return this.prisma.consentTemplate.update({
            where: { id },
            data: {
                ...(dto.title !== undefined ? { title: dto.title } : {}),
                ...(dto.body !== undefined ? { body: dto.body, version: { increment: 1 } } : {}),
                ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
            },
        });
    }
    async deleteTemplate(clinicId, id) {
        const t = await this.getTemplate(clinicId, id);
        if (t.is_default) {
            throw new common_1.BadRequestException('Default templates cannot be deleted — disable them instead (they get re-seeded otherwise).');
        }
        const used = await this.prisma.patientConsent.count({ where: { template_id: t.id } });
        if (used > 0) {
            throw new common_1.BadRequestException('Template is in use by signed consents — disable it instead.');
        }
        await this.prisma.consentTemplate.delete({ where: { id } });
        return { deleted: true };
    }
    async seedDefaults(clinicId, userId) {
        let created = 0;
        let skipped = 0;
        for (const t of default_templates_js_1.DEFAULT_CONSENT_TEMPLATES) {
            const existing = await this.prisma.consentTemplate.findFirst({
                where: { clinic_id: clinicId, code: t.code, language: 'en' },
                select: { id: true },
            });
            if (existing) {
                skipped++;
                continue;
            }
            await this.prisma.consentTemplate.create({
                data: {
                    clinic_id: clinicId,
                    code: t.code,
                    language: 'en',
                    title: t.title,
                    body: t.body,
                    is_default: true,
                    is_active: true,
                    created_by: userId,
                },
            });
            created++;
        }
        return { created, skipped, total: default_templates_js_1.DEFAULT_CONSENT_TEMPLATES.length };
    }
    async aiGenerateTemplate(clinicId, userId, dto) {
        const lang = consent_ai_prompt_js_1.SUPPORTED_CONSENT_LANGUAGES.find((l) => l.code === dto.language);
        if (!lang)
            throw new common_1.BadRequestException(`Language "${dto.language}" is not supported`);
        const userPrompt = (0, consent_ai_prompt_js_1.buildConsentTemplateUserPrompt)({
            procedure_category: dto.procedure_category,
            procedure_examples: dto.procedure_examples,
            language_code: lang.code,
            language_label: lang.label,
            audience_age: dto.audience_age,
            include_anaesthesia_options: dto.include_anaesthesia_options,
            include_witness: dto.include_witness,
            custom_notes: dto.custom_notes,
        });
        const { title, body } = await this.aiService.generateConsentTemplate(clinicId, consent_ai_prompt_js_1.CONSENT_TEMPLATE_SYSTEM_PROMPT, userPrompt, userId);
        const existing = await this.prisma.consentTemplate.findFirst({
            where: { clinic_id: clinicId, code: dto.code, language: lang.code },
        });
        if (existing) {
            return this.prisma.consentTemplate.update({
                where: { id: existing.id },
                data: { title, body: body, is_active: true, version: { increment: 1 } },
            });
        }
        return this.prisma.consentTemplate.create({
            data: {
                clinic_id: clinicId,
                code: dto.code,
                language: lang.code,
                title,
                body: body,
                is_default: false,
                is_active: true,
                created_by: userId,
            },
        });
    }
    async listForPatient(clinicId, patientId) {
        return this.prisma.patientConsent.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            include: {
                template: { select: { id: true, code: true, title: true, language: true, version: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async getOne(clinicId, id) {
        const c = await this.prisma.patientConsent.findUnique({ where: { id } });
        if (!c || c.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Consent not found');
        return c;
    }
    async createForPatient(clinicId, patientId, _userId, dto) {
        const [patient, template] = await Promise.all([
            this.prisma.patient.findUnique({ where: { id: patientId } }),
            this.prisma.consentTemplate.findUnique({ where: { id: dto.template_id } }),
        ]);
        if (!patient || patient.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Patient not found');
        if (!template || template.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Template not found');
        if (!template.is_active)
            throw new common_1.BadRequestException('Template is disabled');
        const branchId = patient.branch_id;
        if (!branchId)
            throw new common_1.BadRequestException('Patient is not assigned to a branch');
        const consent = await this.prisma.patientConsent.create({
            data: {
                clinic_id: clinicId,
                branch_id: branchId,
                patient_id: patientId,
                template_id: template.id,
                treatment_id: dto.treatment_id ?? null,
                appointment_id: dto.appointment_id ?? null,
                status: 'pending',
                template_version: template.version,
                language: template.language,
                notes: dto.procedure ?? null,
            },
        });
        const pdfBuffer = await this.renderPdf(consent.id, { procedure: dto.procedure });
        const key = `clinics/${clinicId}/branches/${branchId}/consents/${consent.id}/generated.pdf`;
        await this.s3.upload(key, pdfBuffer, 'application/pdf');
        await this.prisma.patientConsent.update({
            where: { id: consent.id },
            data: { generated_pdf_key: key },
        });
        return { ...consent, generated_pdf_key: key };
    }
    async getDownloadUrl(clinicId, id) {
        const c = await this.getOne(clinicId, id);
        const key = c.signed_pdf_key ?? c.generated_pdf_key;
        if (!key)
            throw new common_1.NotFoundException('No PDF generated for this consent');
        const url = await this.s3.getSignedUrl(key);
        return { url, signed: Boolean(c.signed_pdf_key) };
    }
    async signDigital(clinicId, id, dto, staffUserId) {
        const consent = await this.getOne(clinicId, id);
        if (consent.status !== 'pending') {
            throw new common_1.BadRequestException(consent.status === 'signed'
                ? 'Consent already signed'
                : `Cannot sign a consent in status "${consent.status}"`);
        }
        const sigBuffer = this.dataUrlToPng(dto.signature_data_url);
        let witnessName = null;
        if (dto.witness_staff_id) {
            const w = await this.prisma.user.findUnique({ where: { id: dto.witness_staff_id } });
            if (!w || w.clinic_id !== clinicId)
                throw new common_1.BadRequestException('Witness not found');
            witnessName = w.name;
        }
        const signedAt = new Date();
        const pdfBuffer = await this.renderPdf(consent.id, {
            procedure: consent.notes ?? undefined,
            signature: {
                method: 'digital',
                signed_by_name: dto.signed_by_name,
                signed_at: signedAt,
                image: sigBuffer,
                witness_name: witnessName,
            },
        });
        const key = `clinics/${clinicId}/branches/${consent.branch_id}/consents/${consent.id}/signed.pdf`;
        await this.s3.upload(key, pdfBuffer, 'application/pdf');
        return this.prisma.patientConsent.update({
            where: { id: consent.id },
            data: {
                status: 'signed',
                signature_method: 'digital',
                signed_via: 'in_clinic_digital',
                signed_pdf_key: key,
                signed_by_name: dto.signed_by_name,
                signed_at: signedAt,
                signed_by_staff_id: staffUserId ?? null,
                witness_staff_id: dto.witness_staff_id ?? null,
                notes: dto.notes ?? consent.notes ?? null,
            },
        });
    }
    async signUpload(clinicId, id, file, signedByName, staffUserId) {
        const consent = await this.getOne(clinicId, id);
        if (consent.status !== 'pending') {
            throw new common_1.BadRequestException(consent.status === 'signed'
                ? 'Consent already signed'
                : `Cannot sign a consent in status "${consent.status}"`);
        }
        if (file.size > 10 * 1024 * 1024)
            throw new common_1.BadRequestException('File too large (max 10MB)');
        const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
        if (!allowed.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Only PDF / PNG / JPEG accepted');
        }
        let pdfBuffer;
        let contentType = 'application/pdf';
        if (file.mimetype === 'application/pdf') {
            pdfBuffer = file.buffer;
        }
        else {
            pdfBuffer = await this.imageToPdf(file.buffer);
        }
        const key = `clinics/${clinicId}/branches/${consent.branch_id}/consents/${consent.id}/signed.pdf`;
        await this.s3.upload(key, pdfBuffer, contentType);
        return this.prisma.patientConsent.update({
            where: { id: consent.id },
            data: {
                status: 'signed',
                signature_method: 'upload',
                signed_via: 'paper_upload',
                signed_pdf_key: key,
                signed_by_name: signedByName,
                signed_at: new Date(),
                signed_by_staff_id: staffUserId ?? null,
            },
        });
    }
    async archive(clinicId, id) {
        await this.getOne(clinicId, id);
        return this.prisma.patientConsent.update({
            where: { id },
            data: { status: 'archived' },
        });
    }
    async sendSignLink(clinicId, id, options = {}) {
        const consent = await this.prisma.patientConsent.findUnique({
            where: { id },
            include: {
                patient: true,
                clinic: { select: { id: true, name: true, phone: true } },
                template: { select: { title: true } },
            },
        });
        if (!consent || consent.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Consent not found');
        }
        if (consent.status !== 'pending') {
            throw new common_1.BadRequestException(consent.status === 'signed'
                ? 'Consent already signed'
                : `Cannot send link for a consent in status "${consent.status}"`);
        }
        if (!consent.generated_pdf_key) {
            throw new common_1.BadRequestException('Consent PDF has not been generated yet');
        }
        if (!consent.patient.phone) {
            throw new common_1.BadRequestException('Patient has no phone number on file');
        }
        const frontendUrl = (this.config.get('app.frontendUrl') || '').replace(/\/$/, '');
        if (!frontendUrl) {
            throw new common_1.BadRequestException('Cannot send signing link: app.frontendUrl is not configured on this environment');
        }
        const expiresInHours = Math.max(1, Math.min(options.expires_in_hours ?? 72, 168));
        const tokenRaw = (0, node_crypto_1.randomBytes)(24).toString('hex');
        const tokenHash = this.hashToken(tokenRaw);
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        await this.prisma.patientConsent.update({
            where: { id: consent.id },
            data: {
                signing_token_hash: tokenHash,
                signing_token_expires_at: expiresAt,
                signing_link_sent_at: new Date(),
                signing_link_sent_to: consent.patient.phone,
                otp_code_hash: null,
                otp_expires_at: null,
                otp_verified_at: null,
                otp_attempts: 0,
            },
        });
        const link = `${frontendUrl}/consent/sign/${tokenRaw}`;
        const procedure = consent.notes || consent.template.title;
        const channel = options.channel === 'sms' ? send_message_dto_js_1.MessageChannel.SMS : send_message_dto_js_1.MessageChannel.WHATSAPP;
        let templateId;
        if (channel === send_message_dto_js_1.MessageChannel.WHATSAPP) {
            const tpl = await this.prisma.messageTemplate.findFirst({
                where: {
                    template_name: 'dental_consent_signature_request',
                    channel: 'whatsapp',
                    is_active: true,
                    OR: [{ clinic_id: clinicId }, { clinic_id: null }],
                },
                orderBy: { clinic_id: 'desc' },
            });
            if (!tpl) {
                throw new common_1.BadRequestException('WhatsApp template "dental_consent_signature_request" is not registered. ' +
                    'Restart the backend to seed default templates, then submit it for Meta approval.');
            }
            templateId = tpl.id;
        }
        let sendError;
        try {
            await this.communication.sendMessage(clinicId, {
                patient_id: consent.patient_id,
                channel,
                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                ...(templateId ? { template_id: templateId } : {}),
                body: this.buildSignLinkPlainText({
                    patient_name: consent.patient.first_name,
                    clinic_name: consent.clinic.name,
                    procedure,
                    link,
                    phone: consent.clinic.phone || '',
                }),
                variables: {
                    patient_name: consent.patient.first_name,
                    clinic_name: consent.clinic.name,
                    procedure,
                    link,
                    phone: consent.clinic.phone || '',
                },
                metadata: { consent_id: consent.id, type: 'consent_signature_request' },
            });
        }
        catch (err) {
            sendError = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Consent ${consent.id}: ${channel} send failed — ${sendError}`);
        }
        return {
            sent: !sendError,
            channel,
            link,
            expires_at: expiresAt.toISOString(),
            ...(sendError ? { error: sendError } : {}),
        };
    }
    async getByPublicToken(token) {
        const consent = await this.findByValidToken(token);
        return {
            id: consent.id,
            status: consent.status,
            language: consent.language,
            patient: {
                first_name: consent.patient.first_name,
                last_name: consent.patient.last_name,
                phone_masked: this.maskPhone(consent.patient.phone),
            },
            clinic: {
                name: consent.clinic.name,
            },
            template: {
                title: consent.template.title,
            },
            procedure: consent.notes,
            otp_required: !consent.otp_verified_at,
            otp_verified: Boolean(consent.otp_verified_at),
            expires_at: consent.signing_token_expires_at?.toISOString(),
        };
    }
    async getPublicPdfUrl(token) {
        const consent = await this.findByValidToken(token);
        const key = consent.signed_pdf_key ?? consent.generated_pdf_key;
        if (!key)
            throw new common_1.NotFoundException('No PDF generated for this consent');
        const url = await this.s3.getSignedUrl(key);
        return { url, signed: Boolean(consent.signed_pdf_key) };
    }
    async requestPublicOtp(token) {
        const consent = await this.findByValidToken(token);
        if (consent.status === 'signed') {
            throw new common_1.BadRequestException('Consent already signed');
        }
        if (!consent.patient.phone) {
            throw new common_1.BadRequestException('Patient has no phone number on file');
        }
        const code = String((0, node_crypto_1.randomInt)(100000, 1000000));
        const codeHash = this.hashToken(code);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.prisma.patientConsent.update({
            where: { id: consent.id },
            data: {
                otp_code_hash: codeHash,
                otp_expires_at: expiresAt,
                otp_verified_at: null,
                otp_attempts: 0,
            },
        });
        const tpl = await this.prisma.messageTemplate.findFirst({
            where: {
                template_name: 'dental_consent_otp',
                channel: 'whatsapp',
                is_active: true,
                OR: [{ clinic_id: consent.clinic_id }, { clinic_id: null }],
            },
            orderBy: { clinic_id: 'desc' },
        });
        if (!tpl) {
            throw new common_1.BadRequestException('WhatsApp template "dental_consent_otp" is not registered. ' +
                'Restart the backend to seed default templates, then submit it for Meta approval.');
        }
        await this.communication.sendMessage(consent.clinic_id, {
            patient_id: consent.patient_id,
            channel: send_message_dto_js_1.MessageChannel.WHATSAPP,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: tpl.id,
            body: `OTP Code: ${code}. This is your OTP code for ${consent.clinic.name}. For your security, do not share this code.`,
            variables: { otp: code, clinic_name: consent.clinic.name },
            metadata: { consent_id: consent.id, type: 'consent_otp' },
        });
        return {
            sent: true,
            phone_masked: this.maskPhone(consent.patient.phone),
            expires_at: expiresAt.toISOString(),
        };
    }
    async verifyPublicOtp(token, code) {
        const consent = await this.findByValidToken(token);
        if (!consent.otp_code_hash || !consent.otp_expires_at) {
            throw new common_1.BadRequestException('Please request a new code');
        }
        if (consent.otp_attempts >= 5) {
            throw new common_1.BadRequestException('Too many failed attempts — request a new code');
        }
        if (consent.otp_expires_at.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Code has expired — request a new one');
        }
        const provided = (code ?? '').trim();
        const matches = this.hashesEqual(this.hashToken(provided), consent.otp_code_hash);
        if (!matches) {
            await this.prisma.patientConsent.update({
                where: { id: consent.id },
                data: { otp_attempts: { increment: 1 } },
            });
            throw new common_1.BadRequestException('Incorrect code');
        }
        await this.prisma.patientConsent.update({
            where: { id: consent.id },
            data: { otp_verified_at: new Date() },
        });
        return { verified: true };
    }
    async signPublic(token, dto, request) {
        const consent = await this.findByValidToken(token);
        if (consent.status !== 'pending') {
            throw new common_1.BadRequestException(consent.status === 'signed'
                ? 'Consent already signed'
                : `Cannot sign a consent in status "${consent.status}"`);
        }
        if (!consent.otp_verified_at) {
            throw new common_1.BadRequestException('Please verify your phone with the OTP first');
        }
        if (!dto.agreed) {
            throw new common_1.BadRequestException('You must agree to the consent statement');
        }
        if (!dto.signed_by_name?.trim()) {
            throw new common_1.BadRequestException('Please type your full name');
        }
        const sigBuffer = this.dataUrlToPng(dto.signature_data_url);
        const signedAt = new Date();
        const pdfBuffer = await this.renderPdf(consent.id, {
            procedure: consent.notes ?? undefined,
            signature: {
                method: 'digital',
                signed_by_name: dto.signed_by_name.trim(),
                signed_at: signedAt,
                image: sigBuffer,
                witness_name: null,
            },
        });
        const key = `clinics/${consent.clinic_id}/branches/${consent.branch_id}/consents/${consent.id}/signed.pdf`;
        await this.s3.upload(key, pdfBuffer, 'application/pdf');
        return this.prisma.patientConsent.update({
            where: { id: consent.id },
            data: {
                status: 'signed',
                signature_method: 'digital',
                signed_via: 'remote_link',
                signed_pdf_key: key,
                signed_by_name: dto.signed_by_name.trim(),
                signed_at: signedAt,
                signed_ip: (request.ip ?? '').slice(0, 64) || null,
                signed_user_agent: (request.user_agent ?? '').slice(0, 500) || null,
                signing_token_hash: null,
                signing_token_expires_at: null,
            },
            select: { id: true, status: true, signed_at: true },
        });
    }
    async findByValidToken(token) {
        const tokenHash = this.hashToken((token ?? '').trim());
        if (!tokenHash)
            throw new common_1.NotFoundException('Invalid link');
        const consent = await this.prisma.patientConsent.findFirst({
            where: { signing_token_hash: tokenHash },
            include: {
                patient: true,
                clinic: { select: { id: true, name: true, phone: true } },
                template: { select: { title: true } },
            },
        });
        if (!consent)
            throw new common_1.NotFoundException('Invalid or expired link');
        if (!consent.signing_token_expires_at ||
            consent.signing_token_expires_at.getTime() < Date.now()) {
            throw new common_1.BadRequestException('This signing link has expired — please ask the clinic for a new one');
        }
        return consent;
    }
    hashToken(value) {
        return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
    }
    hashesEqual(a, b) {
        if (a.length !== b.length)
            return false;
        try {
            return (0, node_crypto_1.timingSafeEqual)(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
        }
        catch {
            return false;
        }
    }
    maskPhone(phone) {
        if (!phone)
            return '';
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 4)
            return '••••';
        return `••••${digits.slice(-4)}`;
    }
    buildSignLinkPlainText(vars) {
        return (`Hi ${vars.patient_name}, ${vars.clinic_name} has shared a consent form for your upcoming ${vars.procedure}.\n\n` +
            `Please review and sign securely on your phone:\n${vars.link}\n\n` +
            `Link expires in 72 hours.${vars.phone ? ` For any questions, contact us at ${vars.phone}.` : ''}`);
    }
    async renderPdf(consentId, opts) {
        const consent = await this.prisma.patientConsent.findUnique({
            where: { id: consentId },
            include: {
                template: true,
                clinic: true,
                branch: true,
                patient: true,
                signed_by: true,
                witness: true,
            },
        });
        if (!consent)
            throw new common_1.NotFoundException('Consent not found');
        let logoBuffer = null;
        if (consent.clinic.logo_url) {
            try {
                logoBuffer = await this.s3.getObject(consent.clinic.logo_url);
            }
            catch (err) {
                this.logger.warn(`Failed to load clinic logo: ${err.message}`);
            }
        }
        const age = consent.patient.date_of_birth
            ? Math.floor((Date.now() - new Date(consent.patient.date_of_birth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000))
            : consent.patient.age ?? null;
        return this.pdfService.generate({
            template_title: consent.template.title,
            template_version: consent.template_version,
            language: consent.language,
            body: consent.template.body,
            procedure: opts.procedure ?? consent.notes ?? null,
            generated_at: new Date(),
            clinic: {
                name: consent.clinic.name,
                email: consent.clinic.email,
                phone: consent.clinic.phone,
                address: consent.clinic.address,
                city: consent.clinic.city,
                state: consent.clinic.state,
                logo_image: logoBuffer,
            },
            branch: {
                name: consent.branch.name,
                phone: consent.branch.phone,
                address: consent.branch.address,
                city: consent.branch.city,
            },
            patient: {
                id: consent.patient.id,
                first_name: consent.patient.first_name,
                last_name: consent.patient.last_name,
                phone: consent.patient.phone,
                age,
                gender: consent.patient.gender,
                date_of_birth: consent.patient.date_of_birth,
            },
            doctor: consent.signed_by
                ? {
                    name: consent.signed_by.name,
                    license_number: null,
                    signature_image: null,
                }
                : null,
            signature: opts.signature ?? null,
        });
    }
    dataUrlToPng(dataUrl) {
        const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl.trim());
        if (!m)
            throw new common_1.BadRequestException('Invalid signature data URL — expected a base64 PNG/JPEG');
        return Buffer.from(m[2], 'base64');
    }
    async imageToPdf(imageBuffer) {
        const { default: PDFDocument } = await import('pdfkit');
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            try {
                doc.image(imageBuffer, { fit: [515, 750], align: 'center', valign: 'center' });
            }
            catch (err) {
                reject(new common_1.BadRequestException('Could not embed signed image'));
                return;
            }
            doc.end();
        });
    }
};
exports.ConsentService = ConsentService;
exports.ConsentService = ConsentService = ConsentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        s3_service_js_1.S3Service,
        consent_pdf_service_js_1.ConsentPdfService,
        ai_service_js_1.AiService,
        config_1.ConfigService,
        communication_service_js_1.CommunicationService])
], ConsentService);
//# sourceMappingURL=consent.service.js.map