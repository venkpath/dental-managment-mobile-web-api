import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { TreatmentMediaService } from './treatment-media.service.js';
import { UploadTreatmentMediaDto } from './dto/upload-treatment-media.dto.js';
export declare class TreatmentMediaController {
    private readonly treatmentMediaService;
    private readonly jwtService;
    constructor(treatmentMediaService: TreatmentMediaService, jwtService: JwtService);
    upload(clinicId: string, treatmentId: string, req: Request, file: Express.Multer.File, dto: UploadTreatmentMediaDto): Promise<{
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
        file_url: string;
        file_name: string;
        original_name: string;
        uploaded_by: string;
        treatment_id: string;
        media_type: string;
        original_size: number;
        stored_size: number;
        visit_date: Date;
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
        file_url: string;
        file_name: string;
        original_name: string;
        uploaded_by: string;
        treatment_id: string;
        media_type: string;
        original_size: number;
        stored_size: number;
        visit_date: Date;
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
        file_url: string;
        file_name: string;
        original_name: string;
        uploaded_by: string;
        treatment_id: string;
        media_type: string;
        original_size: number;
        stored_size: number;
        visit_date: Date;
    })[]>;
    serveFile(id: string, token: string, clinicId: string, res: Response): Promise<void>;
    remove(clinicId: string, id: string): Promise<{
        deleted: boolean;
    }>;
}
