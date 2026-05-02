import type { Request } from 'express';
import { ConsentService } from './consent.service.js';
import { AiGenerateConsentTemplateDto, CreateConsentTemplateDto, CreatePatientConsentDto, PublicSignConsentDto, SendConsentLinkDto, SignDigitalConsentDto, UpdateConsentTemplateDto, VerifyConsentOtpDto } from './dto.js';
export declare class ConsentController {
    private readonly consents;
    constructor(consents: ConsentService);
    listLanguages(): readonly [{
        readonly code: "en";
        readonly label: "English";
    }, {
        readonly code: "hi";
        readonly label: "Hindi (हिन्दी)";
    }, {
        readonly code: "ta";
        readonly label: "Tamil (தமிழ்)";
    }, {
        readonly code: "te";
        readonly label: "Telugu (తెలుగు)";
    }, {
        readonly code: "kn";
        readonly label: "Kannada (ಕನ್ನಡ)";
    }, {
        readonly code: "ml";
        readonly label: "Malayalam (മലയാളം)";
    }, {
        readonly code: "mr";
        readonly label: "Marathi (मराठी)";
    }, {
        readonly code: "bn";
        readonly label: "Bengali (বাংলা)";
    }, {
        readonly code: "gu";
        readonly label: "Gujarati (ગુજરાતી)";
    }, {
        readonly code: "pa";
        readonly label: "Punjabi (ਪੰਜਾਬੀ)";
    }, {
        readonly code: "or";
        readonly label: "Odia (ଓଡ଼ିଆ)";
    }];
    list(req: Request, language?: string, code?: string, isActive?: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        code: string;
        clinic_id: string;
        body: import("@prisma/client/runtime/client").JsonValue;
        language: string;
        is_active: boolean;
        title: string;
        version: number;
        created_by: string | null;
        is_default: boolean;
    }[]>;
    get(req: Request, id: string): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        code: string;
        clinic_id: string;
        body: import("@prisma/client/runtime/client").JsonValue;
        language: string;
        is_active: boolean;
        title: string;
        version: number;
        created_by: string | null;
        is_default: boolean;
    }>;
    create(req: Request, dto: CreateConsentTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        code: string;
        clinic_id: string;
        body: import("@prisma/client/runtime/client").JsonValue;
        language: string;
        is_active: boolean;
        title: string;
        version: number;
        created_by: string | null;
        is_default: boolean;
    }>;
    seedDefaults(req: Request): Promise<{
        created: number;
        skipped: number;
        total: number;
    }>;
    aiGenerate(req: Request, dto: AiGenerateConsentTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        code: string;
        clinic_id: string;
        body: import("@prisma/client/runtime/client").JsonValue;
        language: string;
        is_active: boolean;
        title: string;
        version: number;
        created_by: string | null;
        is_default: boolean;
    }>;
    update(req: Request, id: string, dto: UpdateConsentTemplateDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        code: string;
        clinic_id: string;
        body: import("@prisma/client/runtime/client").JsonValue;
        language: string;
        is_active: boolean;
        title: string;
        version: number;
        created_by: string | null;
        is_default: boolean;
    }>;
    remove(req: Request, id: string): Promise<{
        deleted: boolean;
    }>;
    listForPatient(req: Request, patientId: string): Promise<({
        template: {
            id: string;
            code: string;
            language: string;
            title: string;
            version: number;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        language: string;
        patient_id: string;
        template_id: string;
        notes: string | null;
        appointment_id: string | null;
        treatment_id: string | null;
        template_version: number;
        generated_pdf_key: string | null;
        signed_pdf_key: string | null;
        signature_method: string | null;
        signed_by_name: string | null;
        signed_at: Date | null;
        signed_by_staff_id: string | null;
        witness_staff_id: string | null;
        signed_via: string | null;
        signing_token_hash: string | null;
        signing_token_expires_at: Date | null;
        signing_link_sent_at: Date | null;
        signing_link_sent_to: string | null;
        otp_code_hash: string | null;
        otp_expires_at: Date | null;
        otp_verified_at: Date | null;
        otp_attempts: number;
        signed_ip: string | null;
        signed_user_agent: string | null;
    })[]>;
    createForPatient(req: Request, patientId: string, dto: CreatePatientConsentDto): Promise<{
        generated_pdf_key: string;
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        language: string;
        patient_id: string;
        template_id: string;
        notes: string | null;
        appointment_id: string | null;
        treatment_id: string | null;
        template_version: number;
        signed_pdf_key: string | null;
        signature_method: string | null;
        signed_by_name: string | null;
        signed_at: Date | null;
        signed_by_staff_id: string | null;
        witness_staff_id: string | null;
        signed_via: string | null;
        signing_token_hash: string | null;
        signing_token_expires_at: Date | null;
        signing_link_sent_at: Date | null;
        signing_link_sent_to: string | null;
        otp_code_hash: string | null;
        otp_expires_at: Date | null;
        otp_verified_at: Date | null;
        otp_attempts: number;
        signed_ip: string | null;
        signed_user_agent: string | null;
    }>;
    download(req: Request, id: string): Promise<{
        url: string;
        signed: boolean;
    }>;
    signDigital(req: Request, id: string, dto: SignDigitalConsentDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        language: string;
        patient_id: string;
        template_id: string;
        notes: string | null;
        appointment_id: string | null;
        treatment_id: string | null;
        template_version: number;
        generated_pdf_key: string | null;
        signed_pdf_key: string | null;
        signature_method: string | null;
        signed_by_name: string | null;
        signed_at: Date | null;
        signed_by_staff_id: string | null;
        witness_staff_id: string | null;
        signed_via: string | null;
        signing_token_hash: string | null;
        signing_token_expires_at: Date | null;
        signing_link_sent_at: Date | null;
        signing_link_sent_to: string | null;
        otp_code_hash: string | null;
        otp_expires_at: Date | null;
        otp_verified_at: Date | null;
        otp_attempts: number;
        signed_ip: string | null;
        signed_user_agent: string | null;
    }>;
    signUpload(req: Request, id: string, file: Express.Multer.File, signedByName: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        language: string;
        patient_id: string;
        template_id: string;
        notes: string | null;
        appointment_id: string | null;
        treatment_id: string | null;
        template_version: number;
        generated_pdf_key: string | null;
        signed_pdf_key: string | null;
        signature_method: string | null;
        signed_by_name: string | null;
        signed_at: Date | null;
        signed_by_staff_id: string | null;
        witness_staff_id: string | null;
        signed_via: string | null;
        signing_token_hash: string | null;
        signing_token_expires_at: Date | null;
        signing_link_sent_at: Date | null;
        signing_link_sent_to: string | null;
        otp_code_hash: string | null;
        otp_expires_at: Date | null;
        otp_verified_at: Date | null;
        otp_attempts: number;
        signed_ip: string | null;
        signed_user_agent: string | null;
    }>;
    archive(req: Request, id: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        language: string;
        patient_id: string;
        template_id: string;
        notes: string | null;
        appointment_id: string | null;
        treatment_id: string | null;
        template_version: number;
        generated_pdf_key: string | null;
        signed_pdf_key: string | null;
        signature_method: string | null;
        signed_by_name: string | null;
        signed_at: Date | null;
        signed_by_staff_id: string | null;
        witness_staff_id: string | null;
        signed_via: string | null;
        signing_token_hash: string | null;
        signing_token_expires_at: Date | null;
        signing_link_sent_at: Date | null;
        signing_link_sent_to: string | null;
        otp_code_hash: string | null;
        otp_expires_at: Date | null;
        otp_verified_at: Date | null;
        otp_attempts: number;
        signed_ip: string | null;
        signed_user_agent: string | null;
    }>;
    sendLink(req: Request, id: string, dto: SendConsentLinkDto): Promise<{
        error?: string | undefined;
        sent: boolean;
        channel: import("../communication/dto/send-message.dto.js").MessageChannel;
        link: string;
        expires_at: string;
    }>;
    publicGet(token: string): Promise<{
        id: string;
        status: string;
        language: string;
        patient: {
            first_name: string;
            last_name: string;
            phone_masked: string;
        };
        clinic: {
            name: string;
        };
        template: {
            title: string;
        };
        procedure: string | null;
        otp_required: boolean;
        otp_verified: boolean;
        expires_at: string | undefined;
    }>;
    publicPdf(token: string): Promise<{
        url: string;
        signed: boolean;
    }>;
    publicRequestOtp(token: string): Promise<{
        sent: boolean;
        phone_masked: string;
        expires_at: string;
    }>;
    publicVerifyOtp(token: string, dto: VerifyConsentOtpDto): Promise<{
        verified: boolean;
    }>;
    publicSign(req: Request, token: string, dto: PublicSignConsentDto): Promise<{
        id: string;
        status: string;
        signed_at: Date | null;
    }>;
}
