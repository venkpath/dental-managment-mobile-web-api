export interface ConsentTemplateBody {
    intro?: string;
    procedure_clause?: string;
    anaesthesia_options?: string[];
    sections: Array<{
        heading: string;
        paragraphs?: string[];
        bullets?: string[];
    }>;
    consent_statement: string;
    doctor_statement?: string;
    signature_lines: Array<'patient' | 'guardian' | 'witness' | 'doctor'>;
}
export interface ConsentTemplateSeed {
    code: string;
    title: string;
    is_default: boolean;
    body: ConsentTemplateBody;
}
export declare const DEFAULT_CONSENT_TEMPLATES: ConsentTemplateSeed[];
