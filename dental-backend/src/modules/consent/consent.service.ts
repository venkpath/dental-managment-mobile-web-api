import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { AiService } from '../ai/ai.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageCategory, MessageChannel } from '../communication/dto/send-message.dto.js';
import { ConsentPdfService, type ConsentPdfData } from './consent-pdf.service.js';
import { DEFAULT_CONSENT_TEMPLATES, type ConsentTemplateBody } from './default-templates.js';
import {
  CONSENT_TEMPLATE_SYSTEM_PROMPT,
  buildConsentTemplateUserPrompt,
  SUPPORTED_CONSENT_LANGUAGES,
} from './consent-ai.prompt.js';
import type {
  AiGenerateConsentTemplateDto,
  CreateConsentTemplateDto,
  CreatePatientConsentDto,
  SignDigitalConsentDto,
  UpdateConsentTemplateDto,
} from './dto.js';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly pdfService: ConsentPdfService,
    private readonly aiService: AiService,
    private readonly config: ConfigService,
    private readonly communication: CommunicationService,
  ) {}

  // ──────────────── Templates ──────────────────────────────────────

  async listTemplates(clinicId: string, query: { language?: string; code?: string; is_active?: boolean }) {
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

  async getTemplate(clinicId: string, id: string) {
    const t = await this.prisma.consentTemplate.findUnique({ where: { id } });
    if (!t || t.clinic_id !== clinicId) throw new NotFoundException('Consent template not found');
    return t;
  }

  async createTemplate(clinicId: string, userId: string, dto: CreateConsentTemplateDto) {
    return this.prisma.consentTemplate.create({
      data: {
        clinic_id: clinicId,
        code: dto.code,
        language: dto.language,
        title: dto.title,
        body: dto.body as object,
        is_default: dto.is_default ?? false,
        is_active: dto.is_active ?? true,
        created_by: userId,
      },
    });
  }

  async updateTemplate(clinicId: string, id: string, dto: UpdateConsentTemplateDto) {
    await this.getTemplate(clinicId, id);
    return this.prisma.consentTemplate.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body as object, version: { increment: 1 } } : {}),
        ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
      },
    });
  }

  async deleteTemplate(clinicId: string, id: string) {
    const t = await this.getTemplate(clinicId, id);
    if (t.is_default) {
      throw new BadRequestException(
        'Default templates cannot be deleted — disable them instead (they get re-seeded otherwise).',
      );
    }
    const used = await this.prisma.patientConsent.count({ where: { template_id: t.id } });
    if (used > 0) {
      throw new BadRequestException('Template is in use by signed consents — disable it instead.');
    }
    await this.prisma.consentTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Idempotent: insert any missing default English templates for the clinic.
   *
   * We only create rows that don't yet exist — we never overwrite an
   * existing default template's body/title, because admins routinely tweak
   * the wording (clinic-specific risks, language) in place. If they want
   * the seed wording back, they can delete the row (after disabling) and
   * re-run this endpoint.
   */
  async seedDefaults(clinicId: string, userId: string) {
    let created = 0;
    let skipped = 0;
    for (const t of DEFAULT_CONSENT_TEMPLATES) {
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
          body: t.body as object,
          is_default: true,
          is_active: true,
          created_by: userId,
        },
      });
      created++;
    }
    return { created, skipped, total: DEFAULT_CONSENT_TEMPLATES.length };
  }

  async aiGenerateTemplate(clinicId: string, userId: string, dto: AiGenerateConsentTemplateDto) {
    const lang = SUPPORTED_CONSENT_LANGUAGES.find((l) => l.code === dto.language);
    if (!lang) throw new BadRequestException(`Language "${dto.language}" is not supported`);

    const userPrompt = buildConsentTemplateUserPrompt({
      procedure_category: dto.procedure_category,
      procedure_examples: dto.procedure_examples,
      language_code: lang.code,
      language_label: lang.label,
      audience_age: dto.audience_age,
      include_anaesthesia_options: dto.include_anaesthesia_options,
      include_witness: dto.include_witness,
      custom_notes: dto.custom_notes,
    });

    const { title, body } = await this.aiService.generateConsentTemplate(
      clinicId,
      CONSENT_TEMPLATE_SYSTEM_PROMPT,
      userPrompt,
      userId,
    );

    // Upsert: if a template with same (clinic, code, language) exists,
    // bump its body and version; else insert new.
    const existing = await this.prisma.consentTemplate.findFirst({
      where: { clinic_id: clinicId, code: dto.code, language: lang.code },
    });
    if (existing) {
      return this.prisma.consentTemplate.update({
        where: { id: existing.id },
        data: { title, body: body as object, is_active: true, version: { increment: 1 } },
      });
    }
    return this.prisma.consentTemplate.create({
      data: {
        clinic_id: clinicId,
        code: dto.code,
        language: lang.code,
        title,
        body: body as object,
        is_default: false,
        is_active: true,
        created_by: userId,
      },
    });
  }

  // ──────────────── Patient consents ───────────────────────────────

  async listForPatient(clinicId: string, patientId: string) {
    return this.prisma.patientConsent.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      include: {
        template: { select: { id: true, code: true, title: true, language: true, version: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getOne(clinicId: string, id: string) {
    const c = await this.prisma.patientConsent.findUnique({ where: { id } });
    if (!c || c.clinic_id !== clinicId) throw new NotFoundException('Consent not found');
    return c;
  }

  async createForPatient(
    clinicId: string,
    patientId: string,
    _userId: string,
    dto: CreatePatientConsentDto,
  ) {
    const [patient, template] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: patientId } }),
      this.prisma.consentTemplate.findUnique({ where: { id: dto.template_id } }),
    ]);
    if (!patient || patient.clinic_id !== clinicId) throw new NotFoundException('Patient not found');
    if (!template || template.clinic_id !== clinicId) throw new NotFoundException('Template not found');
    if (!template.is_active) throw new BadRequestException('Template is disabled');

    // Resolve branch — fallback to patient's branch
    const branchId = patient.branch_id;
    if (!branchId) throw new BadRequestException('Patient is not assigned to a branch');

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

    // Render unsigned PDF and upload
    const pdfBuffer = await this.renderPdf(consent.id, { procedure: dto.procedure });
    const key = `clinics/${clinicId}/branches/${branchId}/consents/${consent.id}/generated.pdf`;
    await this.s3.upload(key, pdfBuffer, 'application/pdf');
    await this.prisma.patientConsent.update({
      where: { id: consent.id },
      data: { generated_pdf_key: key },
    });

    return { ...consent, generated_pdf_key: key };
  }

  async getDownloadUrl(clinicId: string, id: string) {
    const c = await this.getOne(clinicId, id);
    const key = c.signed_pdf_key ?? c.generated_pdf_key;
    if (!key) throw new NotFoundException('No PDF generated for this consent');
    const url = await this.s3.getSignedUrl(key);
    return { url, signed: Boolean(c.signed_pdf_key) };
  }

  async signDigital(
    clinicId: string,
    id: string,
    dto: SignDigitalConsentDto,
    staffUserId?: string,
  ) {
    const consent = await this.getOne(clinicId, id);
    if (consent.status !== 'pending') {
      throw new BadRequestException(
        consent.status === 'signed'
          ? 'Consent already signed'
          : `Cannot sign a consent in status "${consent.status}"`,
      );
    }

    const sigBuffer = this.dataUrlToPng(dto.signature_data_url);

    let witnessName: string | null = null;
    if (dto.witness_staff_id) {
      const w = await this.prisma.user.findUnique({ where: { id: dto.witness_staff_id } });
      if (!w || w.clinic_id !== clinicId) throw new BadRequestException('Witness not found');
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

  async signUpload(
    clinicId: string,
    id: string,
    file: { mimetype: string; buffer: Buffer; size: number },
    signedByName: string,
    staffUserId?: string,
  ) {
    const consent = await this.getOne(clinicId, id);
    if (consent.status !== 'pending') {
      throw new BadRequestException(
        consent.status === 'signed'
          ? 'Consent already signed'
          : `Cannot sign a consent in status "${consent.status}"`,
      );
    }
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('File too large (max 10MB)');

    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF / PNG / JPEG accepted');
    }

    let pdfBuffer: Buffer;
    let contentType = 'application/pdf';
    if (file.mimetype === 'application/pdf') {
      pdfBuffer = file.buffer;
    } else {
      // Wrap an image upload into a single-page A4 PDF
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

  async archive(clinicId: string, id: string) {
    await this.getOne(clinicId, id);
    return this.prisma.patientConsent.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  // ──────────────── Remote-link signing (patient signs on phone) ───

  /**
   * Generate a one-time signing link for the consent and dispatch it to
   * the patient over WhatsApp (falls back to SMS if disabled). Returns the
   * raw URL so staff can copy/paste if delivery fails.
   */
  async sendSignLink(
    clinicId: string,
    id: string,
    options: { channel?: 'whatsapp' | 'sms'; expires_in_hours?: number } = {},
  ) {
    const consent = await this.prisma.patientConsent.findUnique({
      where: { id },
      include: {
        patient: true,
        clinic: { select: { id: true, name: true, phone: true } },
        template: { select: { title: true } },
      },
    });
    if (!consent || consent.clinic_id !== clinicId) {
      throw new NotFoundException('Consent not found');
    }
    if (consent.status !== 'pending') {
      throw new BadRequestException(
        consent.status === 'signed'
          ? 'Consent already signed'
          : `Cannot send link for a consent in status "${consent.status}"`,
      );
    }
    if (!consent.generated_pdf_key) {
      throw new BadRequestException('Consent PDF has not been generated yet');
    }
    if (!consent.patient.phone) {
      throw new BadRequestException('Patient has no phone number on file');
    }

    // Validate config up front so we don't persist a token we can't deliver.
    const frontendUrl = (this.config.get<string>('app.frontendUrl') || '').replace(/\/$/, '');
    if (!frontendUrl) {
      throw new BadRequestException(
        'Cannot send signing link: app.frontendUrl is not configured on this environment',
      );
    }

    const expiresInHours = Math.max(1, Math.min(options.expires_in_hours ?? 72, 168));
    const tokenRaw = randomBytes(24).toString('hex'); // 48 hex chars
    const tokenHash = this.hashToken(tokenRaw);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.prisma.patientConsent.update({
      where: { id: consent.id },
      data: {
        signing_token_hash: tokenHash,
        signing_token_expires_at: expiresAt,
        signing_link_sent_at: new Date(),
        signing_link_sent_to: consent.patient.phone,
        // Reset OTP state for a fresh send
        otp_code_hash: null,
        otp_expires_at: null,
        otp_verified_at: null,
        otp_attempts: 0,
      },
    });

    const link = `${frontendUrl}/consent/sign/${tokenRaw}`;
    const procedure = consent.notes || consent.template.title;
    const channel = options.channel === 'sms' ? MessageChannel.SMS : MessageChannel.WHATSAPP;

    // Outside the 24-hour customer-care window, WhatsApp only delivers
    // template messages — and the template must be Meta-approved. If the DB
    // row is missing, the message would silently fail downstream and staff
    // would think the link was sent. Surface the real state instead.
    let templateId: string | undefined;
    if (channel === MessageChannel.WHATSAPP) {
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
        throw new BadRequestException(
          'WhatsApp template "dental_consent_signature_request" is not registered. ' +
            'Restart the backend to seed default templates, then submit it for Meta approval.',
        );
      }
      templateId = tpl.id;
    }

    let sendError: string | undefined;
    try {
      await this.communication.sendMessage(clinicId, {
        patient_id: consent.patient_id,
        channel,
        category: MessageCategory.TRANSACTIONAL,
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
    } catch (err) {
      sendError = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Consent ${consent.id}: ${channel} send failed — ${sendError}`);
    }

    return {
      sent: !sendError,
      channel,
      link,
      expires_at: expiresAt.toISOString(),
      // When delivery fails, hand the staff the link + reason so they can
      // copy/paste it via another channel.
      ...(sendError ? { error: sendError } : {}),
    };
  }

  /** Public — fetch consent metadata for the sign page (no auth). */
  async getByPublicToken(token: string) {
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

  /** Public — return a presigned URL of the unsigned PDF. */
  async getPublicPdfUrl(token: string) {
    const consent = await this.findByValidToken(token);
    const key = consent.signed_pdf_key ?? consent.generated_pdf_key;
    if (!key) throw new NotFoundException('No PDF generated for this consent');
    const url = await this.s3.getSignedUrl(key);
    return { url, signed: Boolean(consent.signed_pdf_key) };
  }

  /** Public — generate + send a 6-digit OTP to the patient's phone. */
  async requestPublicOtp(token: string) {
    const consent = await this.findByValidToken(token);
    if (consent.status === 'signed') {
      throw new BadRequestException('Consent already signed');
    }
    if (!consent.patient.phone) {
      throw new BadRequestException('Patient has no phone number on file');
    }

    const code = String(randomInt(100000, 1000000));
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

    // OTP delivery MUST succeed for the patient to proceed — we don't catch
    // and lie. Template must exist (Meta won't deliver free-text outside
    // the 24h window). If send fails, the patient retries via "Resend".
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
      throw new BadRequestException(
        'WhatsApp template "dental_consent_otp" is not registered. ' +
          'Restart the backend to seed default templates, then submit it for Meta approval.',
      );
    }
    // Do NOT pass template_id: the communication service would render the template
    // body with actual variables before persisting, storing the plaintext OTP in
    // CommunicationMessage.body. Instead, use whatsapp_template_name metadata so
    // the delivery path sends the real code to Meta while the stored body stays safe.
    await this.communication.sendMessage(consent.clinic_id, {
      patient_id: consent.patient_id,
      channel: MessageChannel.WHATSAPP,
      category: MessageCategory.TRANSACTIONAL,
      body: `Consent verification OTP sent for ${consent.clinic.name}`,
      variables: { '1': code, '2': consent.clinic.name },
      metadata: {
        consent_id: consent.id,
        type: 'consent_otp',
        whatsapp_template_name: tpl.template_name,
        whatsapp_language: tpl.language || 'en_US',
      },
    });

    return {
      sent: true,
      phone_masked: this.maskPhone(consent.patient.phone),
      expires_at: expiresAt.toISOString(),
    };
  }

  /** Public — verify the OTP entered on the sign page. */
  async verifyPublicOtp(token: string, code: string) {
    const consent = await this.findByValidToken(token);
    if (!consent.otp_code_hash || !consent.otp_expires_at) {
      throw new BadRequestException('Please request a new code');
    }
    if (consent.otp_attempts >= 5) {
      throw new BadRequestException('Too many failed attempts — request a new code');
    }
    if (consent.otp_expires_at.getTime() < Date.now()) {
      throw new BadRequestException('Code has expired — request a new one');
    }

    const provided = (code ?? '').trim();
    const matches = this.hashesEqual(this.hashToken(provided), consent.otp_code_hash);
    if (!matches) {
      await this.prisma.patientConsent.update({
        where: { id: consent.id },
        data: { otp_attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect code');
    }

    await this.prisma.patientConsent.update({
      where: { id: consent.id },
      data: { otp_verified_at: new Date() },
    });
    return { verified: true };
  }

  /** Public — finalise the signature after OTP verification. */
  async signPublic(
    token: string,
    dto: { signature_data_url: string; signed_by_name: string; agreed: boolean },
    request: { ip?: string; user_agent?: string },
  ) {
    const consent = await this.findByValidToken(token);
    if (consent.status !== 'pending') {
      throw new BadRequestException(
        consent.status === 'signed'
          ? 'Consent already signed'
          : `Cannot sign a consent in status "${consent.status}"`,
      );
    }
    if (!consent.otp_verified_at) {
      throw new BadRequestException('Please verify your phone with the OTP first');
    }
    if (!dto.agreed) {
      throw new BadRequestException('You must agree to the consent statement');
    }
    if (!dto.signed_by_name?.trim()) {
      throw new BadRequestException('Please type your full name');
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
        // Burn the token so the link can't be reused
        signing_token_hash: null,
        signing_token_expires_at: null,
      },
      select: { id: true, status: true, signed_at: true },
    });
  }

  // ──────────────── Internals ──────────────────────────────────────

  private async findByValidToken(token: string) {
    const tokenHash = this.hashToken((token ?? '').trim());
    if (!tokenHash) throw new NotFoundException('Invalid link');
    const consent = await this.prisma.patientConsent.findFirst({
      where: { signing_token_hash: tokenHash },
      include: {
        patient: true,
        clinic: { select: { id: true, name: true, phone: true } },
        template: { select: { title: true } },
      },
    });
    if (!consent) throw new NotFoundException('Invalid or expired link');
    if (
      !consent.signing_token_expires_at ||
      consent.signing_token_expires_at.getTime() < Date.now()
    ) {
      throw new BadRequestException('This signing link has expired — please ask the clinic for a new one');
    }
    return consent;
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashesEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    } catch {
      return false;
    }
  }

  private maskPhone(phone: string | null | undefined): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '••••';
    return `••••${digits.slice(-4)}`;
  }

  private buildSignLinkPlainText(vars: {
    patient_name: string;
    clinic_name: string;
    procedure: string;
    link: string;
    phone: string;
  }): string {
    return (
      `Hi ${vars.patient_name}, ${vars.clinic_name} has shared a consent form for your upcoming ${vars.procedure}.\n\n` +
      `Please review and sign securely on your phone:\n${vars.link}\n\n` +
      `Link expires in 72 hours.${vars.phone ? ` For any questions, contact us at ${vars.phone}.` : ''}`
    );
  }

  private async renderPdf(
    consentId: string,
    opts: { procedure?: string; signature?: ConsentPdfData['signature'] },
  ): Promise<Buffer> {
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
    if (!consent) throw new NotFoundException('Consent not found');

    let logoBuffer: Buffer | null = null;
    if (consent.clinic.logo_url) {
      try {
        logoBuffer = await this.s3.getObject(consent.clinic.logo_url);
      } catch (err) {
        this.logger.warn(`Failed to load clinic logo: ${(err as Error).message}`);
      }
    }

    const age = consent.patient.date_of_birth
      ? Math.floor(
          (Date.now() - new Date(consent.patient.date_of_birth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : consent.patient.age ?? null;

    return this.pdfService.generate({
      template_title: consent.template.title,
      template_version: consent.template_version,
      language: consent.language,
      body: consent.template.body as unknown as ConsentTemplateBody,
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

  private dataUrlToPng(dataUrl: string): Buffer {
    const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl.trim());
    if (!m) throw new BadRequestException('Invalid signature data URL — expected a base64 PNG/JPEG');
    return Buffer.from(m[2], 'base64');
  }

  private async imageToPdf(imageBuffer: Buffer): Promise<Buffer> {
    const { default: PDFDocument } = await import('pdfkit');
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        doc.image(imageBuffer, { fit: [515, 750], align: 'center', valign: 'center' });
      } catch (err) {
        reject(new BadRequestException('Could not embed signed image'));
        return;
      }
      doc.end();
    });
  }
}
