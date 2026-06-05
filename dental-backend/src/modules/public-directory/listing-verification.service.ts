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

  async stagePendingUpload(
    file: Express.Multer.File,
    documentType: ListingVerificationDocType,
  ) {
    this.validateFile(file);
    const docExt = (extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg')).toLowerCase();
    const s3Key = `${LISTING_PENDING_DOC_PREFIX}${randomUUID()}${docExt}`;
    await this.s3.upload(s3Key, file.buffer, file.mimetype);

    const row = await this.prisma.directoryListingUpload.create({
      data: { s3_key: s3Key, document_type: documentType },
    });

    const uploadToken = await this.jwt.signAsync(
      { upload_id: row.id, s3_key: s3Key, type: 'listing_pending_doc' },
      { expiresIn: '2h' },
    );

    return { upload_token: uploadToken, expires_in_minutes: 120 };
  }

  async discardPendingUpload(uploadToken: string) {
    let payload: { upload_id: string; s3_key: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(uploadToken);
      if (payload.type !== 'listing_pending_doc') throw new Error('wrong type');
    } catch {
      throw new BadRequestException('Invalid or expired upload token.');
    }

    const row = await this.prisma.directoryListingUpload.findUnique({
      where: { id: payload.upload_id },
    });
    if (!row || row.claimed_at) {
      return { discarded: false };
    }
    if (row.s3_key !== payload.s3_key || !row.s3_key.startsWith(LISTING_PENDING_DOC_PREFIX)) {
      throw new BadRequestException('Invalid upload reference.');
    }

    await this.s3.delete(row.s3_key);
    await this.prisma.directoryListingUpload.delete({ where: { id: row.id } });
    return { discarded: true };
  }

  async resolveStagedUpload(uploadToken: string, expectedType?: ListingVerificationDocType) {
    let payload: { upload_id: string; s3_key: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(uploadToken);
      if (payload.type !== 'listing_pending_doc') throw new Error('wrong type');
    } catch {
      throw new BadRequestException('Invalid or expired verification upload. Please re-upload your document.');
    }

    const row = await this.prisma.directoryListingUpload.findUnique({
      where: { id: payload.upload_id },
    });
    if (!row || row.claimed_at) {
      throw new BadRequestException('Verification upload expired or already used. Please re-upload your document.');
    }
    if (row.s3_key !== payload.s3_key || !row.s3_key.startsWith(LISTING_PENDING_DOC_PREFIX)) {
      throw new BadRequestException('Invalid verification upload reference.');
    }
    if (expectedType && row.document_type !== expectedType) {
      throw new BadRequestException('Document type does not match the uploaded file.');
    }

    return row;
  }

  async claimStagedUpload(uploadId: string, clinicId: string) {
    await this.prisma.directoryListingUpload.update({
      where: { id: uploadId },
      data: { claimed_at: new Date(), clinic_id: clinicId },
    });
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

  /** Remove staged uploads abandoned for more than 24 hours. */
  @Cron('0 30 11 * * *', { timeZone: 'Asia/Kolkata' }) // daily at 11:30 AM IST
  async cleanupOrphanedPendingUploads() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orphans = await this.prisma.directoryListingUpload.findMany({
      where: { claimed_at: null, created_at: { lt: cutoff } },
      select: { id: true, s3_key: true },
      take: 200,
    });
    if (!orphans.length) return;

    for (const row of orphans) {
      await this.s3.delete(row.s3_key);
      await this.prisma.directoryListingUpload.delete({ where: { id: row.id } });
    }
    this.logger.log(`Cleaned up ${orphans.length} orphaned listing verification upload(s)`);
  }
}
