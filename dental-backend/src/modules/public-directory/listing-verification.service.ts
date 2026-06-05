import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';

export const LISTING_VERIFICATION_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const LISTING_VERIFICATION_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
]);
export const LISTING_PENDING_DOC_PREFIX = 'listings/verification/pending/';
export const LISTING_VERIFICATION_DOC_PREFIX = 'listings/verification/';

export type ListingVerificationDocType = 'clinic_photo' | 'prescription_pad' | 'invoice' | 'other';

interface PendingDocJwt {
  type: 'listing_pending_doc';
  s3_key: string;
  document_type: ListingVerificationDocType;
}

export interface StagedListingUpload {
  id: string;
  s3_key: string;
  document_type: string;
}

@Injectable()
export class ListingVerificationService {
  private readonly logger = new Logger(ListingVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly jwt: JwtService,
  ) {}

  validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Please upload a verification document (clinic photo, prescription pad, or invoice).',
      );
    }
    if (file.size > LISTING_VERIFICATION_MAX_BYTES) {
      throw new BadRequestException('Verification document must be 10 MB or smaller.');
    }
    if (!LISTING_VERIFICATION_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP images or PDF documents are allowed.');
    }
  }

  private parsePendingToken(uploadToken: string): PendingDocJwt {
    try {
      const payload = this.jwt.verify(uploadToken) as PendingDocJwt;
      if (payload.type !== 'listing_pending_doc') throw new Error('wrong type');
      if (!payload.s3_key?.startsWith(LISTING_PENDING_DOC_PREFIX)) throw new Error('bad key');
      return payload;
    } catch {
      throw new BadRequestException('Invalid or expired upload token.');
    }
  }

  private async isKeyClaimedByClinic(s3Key: string): Promise<boolean> {
    const clinic = await this.prisma.clinic.findFirst({
      where: { directory_verification_document_url: s3Key },
      select: { id: true },
    });
    return !!clinic;
  }

  async stagePendingUpload(
    file: Express.Multer.File,
    documentType: ListingVerificationDocType,
  ) {
    this.validateFile(file);
    const docExt = (extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg')).toLowerCase();
    const s3Key = `${LISTING_PENDING_DOC_PREFIX}${randomUUID()}${docExt}`;
    await this.s3.upload(s3Key, file.buffer, file.mimetype);

    const uploadToken = await this.jwt.signAsync(
      { s3_key: s3Key, document_type: documentType, type: 'listing_pending_doc' } satisfies PendingDocJwt,
      { expiresIn: '2h' },
    );

    return { upload_token: uploadToken, expires_in_minutes: 120 };
  }

  async discardPendingUpload(uploadToken: string) {
    const payload = this.parsePendingToken(uploadToken);
    if (await this.isKeyClaimedByClinic(payload.s3_key)) {
      return { discarded: false };
    }
    await this.s3.delete(payload.s3_key);
    return { discarded: true };
  }

  async resolveStagedUpload(uploadToken: string, expectedType?: ListingVerificationDocType): Promise<StagedListingUpload> {
    const payload = this.parsePendingToken(uploadToken);
    if (expectedType && payload.document_type !== expectedType) {
      throw new BadRequestException('Document type does not match the uploaded file.');
    }
    if (await this.isKeyClaimedByClinic(payload.s3_key)) {
      throw new BadRequestException('Verification upload expired or already used. Please re-upload your document.');
    }
    const exists = await this.s3.objectExists(payload.s3_key);
    if (!exists) {
      throw new BadRequestException('Verification upload expired or already used. Please re-upload your document.');
    }
    return {
      id: payload.s3_key,
      s3_key: payload.s3_key,
      document_type: payload.document_type,
    };
  }

  async uploadAndTrack(file: Express.Multer.File, _documentType: ListingVerificationDocType) {
    this.validateFile(file);
    const docExt = (extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg')).toLowerCase();
    const s3Key = `${LISTING_VERIFICATION_DOC_PREFIX}${randomUUID()}${docExt}`;
    await this.s3.upload(s3Key, file.buffer, file.mimetype);
    return s3Key;
  }

  async discardOrphanKey(s3Key: string) {
    if (s3Key.startsWith(LISTING_PENDING_DOC_PREFIX) || s3Key.startsWith(LISTING_VERIFICATION_DOC_PREFIX)) {
      await this.s3.delete(s3Key);
    }
  }

  /** Remove pending S3 objects older than 24h that were never linked to a clinic. */
  @Cron('0 30 11 * * *', { timeZone: 'Asia/Kolkata' }) // daily at 11:30 AM IST
  async cleanupOrphanedPendingUploads() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const claimed = await this.prisma.clinic.findMany({
      where: {
        directory_verification_document_url: { startsWith: LISTING_PENDING_DOC_PREFIX },
      },
      select: { directory_verification_document_url: true },
    });
    const claimedKeys = new Set(
      claimed.map((c) => c.directory_verification_document_url).filter((k): k is string => !!k),
    );

    const objects = await this.s3.listObjectsByPrefix(LISTING_PENDING_DOC_PREFIX);
    let cleaned = 0;
    for (const obj of objects) {
      if (claimedKeys.has(obj.key)) continue;
      if (obj.lastModified && obj.lastModified.getTime() > cutoff) continue;
      await this.s3.delete(obj.key);
      cleaned++;
    }
    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} orphaned listing verification upload(s)`);
    }
  }
}
