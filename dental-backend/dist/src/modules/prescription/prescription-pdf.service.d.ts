export interface PrescriptionPdfData {
    id: string;
    created_at: Date;
    diagnosis?: string | null;
    instructions?: string | null;
    chief_complaint?: string | null;
    past_dental_history?: string | null;
    allergies_medical_history?: string | null;
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
        first_name: string;
        last_name: string;
        phone?: string | null;
        email?: string | null;
        date_of_birth?: string | Date | null;
        gender?: string | null;
        mr_number?: string | null;
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
    }>;
    treatments?: Array<{
        procedure: string;
        tooth_number?: string | null;
        notes?: string | null;
        status?: string | null;
    }>;
}
export declare class PrescriptionPdfService {
    generate(data: PrescriptionPdfData): Promise<Buffer>;
}
