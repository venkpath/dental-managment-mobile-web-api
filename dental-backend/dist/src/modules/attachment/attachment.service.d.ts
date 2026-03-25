import { PrismaService } from '../../database/prisma.service.js';
export declare class AttachmentService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    uploadFile(clinicId: string, params: {
        patientId: string;
        branchId: string;
        uploadedBy: string;
        type: string;
        file: Express.Multer.File;
    }): Promise<{
        branch: {
            id: string;
            name: string;
        };
        patient: {
            id: string;
            first_name: string;
            last_name: string;
        };
        uploader: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
    } & {
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        type: string;
        patient_id: string;
        file_url: string;
        file_name: string;
        original_name: string;
        mime_type: string;
        ai_analysis: import("@prisma/client/runtime/client").JsonValue | null;
        uploaded_by: string;
    }>;
    findByPatient(clinicId: string, patientId: string): Promise<({
        branch: {
            id: string;
            name: string;
        };
        patient: {
            id: string;
            first_name: string;
            last_name: string;
        };
        uploader: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
    } & {
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        type: string;
        patient_id: string;
        file_url: string;
        file_name: string;
        original_name: string;
        mime_type: string;
        ai_analysis: import("@prisma/client/runtime/client").JsonValue | null;
        uploaded_by: string;
    })[]>;
    findById(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        type: string;
        patient_id: string;
        file_url: string;
        file_name: string;
        original_name: string;
        mime_type: string;
        ai_analysis: import("@prisma/client/runtime/client").JsonValue | null;
        uploaded_by: string;
    }>;
    updateAnalysis(clinicId: string, id: string, analysis: Record<string, unknown>): Promise<{
        branch: {
            id: string;
            name: string;
        };
        patient: {
            id: string;
            first_name: string;
            last_name: string;
        };
        uploader: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
    } & {
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        type: string;
        patient_id: string;
        file_url: string;
        file_name: string;
        original_name: string;
        mime_type: string;
        ai_analysis: import("@prisma/client/runtime/client").JsonValue | null;
        uploaded_by: string;
    }>;
    remove(clinicId: string, id: string): Promise<{
        deleted: boolean;
    }>;
}
