import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
export declare const LISTING_VERIFICATION_MAX_BYTES: number;
export declare const LISTING_VERIFICATION_MIME_TYPES: Set<string>;
export declare const LISTING_PENDING_DOC_PREFIX = "listings/verification/pending/";
export declare const LISTING_VERIFICATION_DOC_PREFIX = "listings/verification/";
export type ListingVerificationDocType = 'clinic_photo' | 'prescription_pad' | 'invoice' | 'other';
export declare class ListingVerificationService {
    private readonly prisma;
    private readonly s3;
    private readonly jwt;
    private readonly logger;
    constructor(prisma: PrismaService, s3: S3Service, jwt: JwtService);
    validateFile(file: Express.Multer.File): void;
    stagePendingUpload(file: Express.Multer.File, documentType: ListingVerificationDocType): Promise<{
        upload_token: string;
        expires_in_minutes: number;
    }>;
    discardPendingUpload(uploadToken: string): Promise<{
        discarded: boolean;
    }>;
    resolveStagedUpload(uploadToken: string, expectedType?: ListingVerificationDocType): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string | null;
        s3_key: string;
        document_type: string;
        claimed_at: Date | null;
    }>;
    claimStagedUpload(uploadId: string, clinicId: string): Promise<void>;
    uploadAndTrack(file: Express.Multer.File, _documentType: ListingVerificationDocType): Promise<string>;
    discardOrphanKey(s3Key: string): Promise<void>;
    cleanupOrphanedPendingUploads(): Promise<void>;
}
