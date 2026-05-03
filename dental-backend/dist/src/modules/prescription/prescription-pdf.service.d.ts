export interface PrescriptionTemplateZone {
    x: number;
    y: number;
    w: number;
    h: number;
    font_size?: number;
    align?: 'left' | 'center' | 'right';
    line_height?: number;
    prefix?: string;
    suffix?: string;
    show_label?: boolean;
}
export interface PrescriptionTemplateConfig {
    version: 1;
    image: {
        width_px: number;
        height_px: number;
    };
    page_size?: 'A4' | 'A5' | 'LETTER';
    zones: {
        patient_name: PrescriptionTemplateZone;
        age?: PrescriptionTemplateZone;
        gender?: PrescriptionTemplateZone;
        date: PrescriptionTemplateZone;
        mobile?: PrescriptionTemplateZone;
        patient_id?: PrescriptionTemplateZone;
        body: PrescriptionTemplateZone;
        signature?: PrescriptionTemplateZone;
    };
}
export interface PrescriptionPdfData {
    id: string;
    created_at: Date;
    diagnosis?: string | null;
    instructions?: string | null;
    chief_complaint?: string | null;
    past_dental_history?: string | null;
    allergies_medical_history?: string | null;
    interactions?: string | null;
    dietary_advice?: string | null;
    post_procedure_instructions?: string | null;
    follow_up?: string | null;
    review_after_date?: string | Date | null;
    clinic: {
        name: string;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        gst_number?: string | null;
    };
    branch: {
        name: string;
        phone?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
    };
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        phone?: string | null;
        email?: string | null;
        date_of_birth?: string | Date | null;
        age?: number | null;
        gender?: string | null;
    };
    dentist: {
        name: string;
        specialization?: string | null;
        qualification?: string | null;
        license_number?: string | null;
        signature_image?: Buffer | null;
    };
    items: Array<{
        medicine_name: string;
        dosage?: string | null;
        frequency?: string | null;
        duration?: string | null;
        morning?: number | null;
        afternoon?: number | null;
        evening?: number | null;
        night?: number | null;
        notes?: string | null;
        route?: string | null;
        purpose?: string | null;
        warnings?: string | null;
    }>;
    treatments?: Array<{
        procedure: string;
        tooth_number?: string | null;
        notes?: string | null;
        status?: string | null;
    }>;
    template?: {
        config: PrescriptionTemplateConfig;
        imageBuffer: Buffer;
        withBackground: boolean;
    };
}
export declare class PrescriptionPdfService {
    generate(data: PrescriptionPdfData): Promise<Buffer>;
    private generateDefault;
    private generateCustomTemplate;
}
