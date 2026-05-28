import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
export declare class TreatmentMediaService {
    private readonly prisma;
    private readonly s3;
    private readonly logger;
    constructor(prisma: PrismaService, s3: S3Service);
    upload(clinicId: string, params: {
        treatmentId: string;
        branchId: string;
        uploadedBy: string;
        mediaType: string;
        visitDate: string;
        caption?: string;
        file: Express.Multer.File;
    }): Promise<{
        uploader: {
            id: string;
            name: string;
            role: string;
        };
    } & {
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        mime_type: string;
        caption: string | null;
        file_name: string;
        treatment_id: string;
        visit_date: Date;
        file_url: string;
        original_name: string;
        media_type: string;
        original_size: number;
        stored_size: number;
        uploaded_by: string;
    }>;
    findByTreatment(clinicId: string, treatmentId: string): Promise<({
        uploader: {
            id: string;
            name: string;
            role: string;
        };
    } & {
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        mime_type: string;
        caption: string | null;
        file_name: string;
        treatment_id: string;
        visit_date: Date;
        file_url: string;
        original_name: string;
        media_type: string;
        original_size: number;
        stored_size: number;
        uploaded_by: string;
    })[]>;
    findByPatient(clinicId: string, patientId: string): Promise<({
        treatment: {
            id: string;
            status: string;
            procedure: string;
        };
        uploader: {
            id: string;
            name: string;
            role: string;
        };
    } & {
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        mime_type: string;
        caption: string | null;
        file_name: string;
        treatment_id: string;
        visit_date: Date;
        file_url: string;
        original_name: string;
        media_type: string;
        original_size: number;
        stored_size: number;
        uploaded_by: string;
    })[]>;
    findById(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        mime_type: string;
        caption: string | null;
        file_name: string;
        treatment_id: string;
        visit_date: Date;
        file_url: string;
        original_name: string;
        media_type: string;
        original_size: number;
        stored_size: number;
        uploaded_by: string;
    }>;
    getSignedUrl(clinicId: string, id: string): Promise<string>;
    remove(clinicId: string, id: string): Promise<{
        deleted: boolean;
    }>;
}
