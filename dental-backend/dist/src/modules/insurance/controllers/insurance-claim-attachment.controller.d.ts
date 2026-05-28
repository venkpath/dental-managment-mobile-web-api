import type { Response } from 'express';
import { InsuranceClaimAttachmentService } from '../services/insurance-claim-attachment.service.js';
export declare class InsuranceClaimAttachmentController {
    private readonly svc;
    constructor(svc: InsuranceClaimAttachmentService);
    list(clinicId: string, claimId: string): Promise<{
        id: string;
        description: string | null;
        type: string;
        mime_type: string;
        file_name: string;
        file_url: string;
        original_name: string;
        size_bytes: number | null;
        claim_id: string;
        uploaded_by_user_id: string | null;
        uploaded_at: Date;
    }[]>;
    upload(clinicId: string, user: {
        sub: string;
    }, claimId: string, file: Express.Multer.File, type: string, description?: string): Promise<{
        id: string;
        description: string | null;
        type: string;
        mime_type: string;
        file_name: string;
        file_url: string;
        original_name: string;
        size_bytes: number | null;
        claim_id: string;
        uploaded_by_user_id: string | null;
        uploaded_at: Date;
    }>;
    getDownloadToken(clinicId: string, claimId: string, attachmentId: string): Promise<{
        token: string;
        file_url: string;
        original_name: string;
    }>;
    delete(clinicId: string, claimId: string, attachmentId: string): Promise<void>;
}
export declare class InsuranceClaimAttachmentServeController {
    private readonly svc;
    constructor(svc: InsuranceClaimAttachmentService);
    serve(clinicId: string, filePath: string, token: string, res: Response): Promise<void>;
}
