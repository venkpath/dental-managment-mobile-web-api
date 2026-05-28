import { PrismaService } from '../../../database/prisma.service.js';
import { InsuranceFileService } from './insurance-file.service.js';
export declare class InsuranceClaimAttachmentService {
    private readonly prisma;
    private readonly files;
    constructor(prisma: PrismaService, files: InsuranceFileService);
    list(claimId: string, clinicId: string): Promise<{
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
    upload(params: {
        claimId: string;
        clinicId: string;
        userId: string;
        type: string;
        description?: string;
        file: Express.Multer.File;
    }): Promise<{
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
    delete(attachmentId: string, claimId: string, clinicId: string): Promise<void>;
    getDownloadToken(attachmentId: string, claimId: string, clinicId: string): Promise<{
        token: string;
        file_url: string;
        original_name: string;
    }>;
    serveFile(clinicId: string, filePath: string, token: string): string;
    private assertClaimOwnership;
}
