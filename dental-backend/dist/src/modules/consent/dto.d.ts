export declare class ConsentSectionDto {
    heading: string;
    paragraphs?: string[];
    bullets?: string[];
}
export declare class ConsentTemplateBodyDto {
    intro?: string;
    procedure_clause?: string;
    anaesthesia_options?: string[];
    sections: ConsentSectionDto[];
    consent_statement: string;
    doctor_statement?: string;
    signature_lines: Array<'patient' | 'guardian' | 'witness' | 'doctor'>;
}
export declare class CreateConsentTemplateDto {
    code: string;
    language: string;
    title: string;
    body: ConsentTemplateBodyDto;
    is_default?: boolean;
    is_active?: boolean;
}
export declare class UpdateConsentTemplateDto {
    title?: string;
    body?: ConsentTemplateBodyDto;
    is_active?: boolean;
    version?: number;
}
export declare class AiGenerateConsentTemplateDto {
    code: string;
    language: string;
    procedure_category: string;
    procedure_examples?: string;
    audience_age?: 'adult' | 'child' | 'either';
    include_anaesthesia_options?: boolean;
    include_witness?: boolean;
    custom_notes?: string;
}
export declare class CreatePatientConsentDto {
    template_id: string;
    treatment_id?: string;
    appointment_id?: string;
    procedure?: string;
}
export declare class SignDigitalConsentDto {
    signature_data_url: string;
    signed_by_name: string;
    witness_staff_id?: string;
    notes?: string;
}
export declare class SendConsentLinkDto {
    channel?: 'whatsapp' | 'sms';
    expires_in_hours?: number;
}
export declare class VerifyConsentOtpDto {
    code: string;
}
export declare class PublicSignConsentDto {
    signature_data_url: string;
    signed_by_name: string;
    agreed: boolean;
}
