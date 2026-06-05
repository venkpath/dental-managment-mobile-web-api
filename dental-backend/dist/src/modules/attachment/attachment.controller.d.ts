import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AttachmentService } from './attachment.service.js';
export declare class AttachmentController {
    private readonly attachmentService;
    private readonly jwtService;
    constructor(attachmentService: AttachmentService, jwtService: JwtService);
    upload(clinicId: string, patientId: string, req: Request, file: Express.Multer.File, type: string, branchId: string): Promise<{
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
        mime_type: string;
        file_url: string;
        file_name: string;
        original_name: string;
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
        mime_type: string;
        file_url: string;
        file_name: string;
        original_name: string;
        ai_analysis: import("@prisma/client/runtime/client").JsonValue | null;
        uploaded_by: string;
    })[]>;
    serveFile(id: string, token: string, clinicId: string, res: Response): Promise<void>;
    remove(clinicId: string, id: string): Promise<{
        deleted: boolean;
    }>;
}
