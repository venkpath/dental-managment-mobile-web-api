import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { InsuranceFileService } from './insurance-file.service.js';

const VALID_TYPES = new Set([
  'XRAY', 'CONSENT', 'TREATMENT_PLAN', 'PRESCRIPTION',
  'INVOICE_COPY', 'APPROVAL_LETTER', 'REJECTION_LETTER',
  'QUERY_LETTER', 'QUERY_RESPONSE', 'EOB', 'SETTLEMENT_LETTER', 'OTHER',
]);

@Injectable()
export class InsuranceClaimAttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: InsuranceFileService,
  ) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  async list(claimId: string, clinicId: string) {
    await this.assertClaimOwnership(claimId, clinicId);
    return this.prisma.insuranceClaimAttachment.findMany({
      where: { claim_id: claimId },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async upload(params: {
    claimId: string;
    clinicId: string;
    userId: string;
    type: string;
    description?: string;
    file: Express.Multer.File;
  }) {
    const { claimId, clinicId, userId, type, description, file } = params;

    if (!VALID_TYPES.has(type)) {
      throw new NotFoundException(`Invalid attachment type: ${type}`);
    }
    await this.assertClaimOwnership(claimId, clinicId);

    const saved = await this.files.save({ clinicId, subdir: 'claim-attachments', file });

    return this.prisma.insuranceClaimAttachment.create({
      data: {
        claim_id: claimId,
        type,
        file_url: saved.file_url,
        file_name: saved.file_name,
        original_name: saved.original_name,
        mime_type: saved.mime_type,
        size_bytes: saved.size_bytes,
        uploaded_by_user_id: userId,
        description: description ?? null,
      },
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(attachmentId: string, claimId: string, clinicId: string) {
    await this.assertClaimOwnership(claimId, clinicId);

    const attachment = await this.prisma.insuranceClaimAttachment.findFirst({
      where: { id: attachmentId, claim_id: claimId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.files.remove(attachment.file_url);
    await this.prisma.insuranceClaimAttachment.delete({ where: { id: attachmentId } });
  }

  // ─── Download token ───────────────────────────────────────────────────────

  async getDownloadToken(attachmentId: string, claimId: string, clinicId: string) {
    await this.assertClaimOwnership(claimId, clinicId);

    const attachment = await this.prisma.insuranceClaimAttachment.findFirst({
      where: { id: attachmentId, claim_id: claimId },
      select: { file_url: true, original_name: true, mime_type: true },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const { token } = this.files.buildDownloadUrl({ clinicId, filePath: attachment.file_url });
    return { token, file_url: attachment.file_url, original_name: attachment.original_name };
  }

  // ─── Serve (public endpoint with token validation) ────────────────────────

  serveFile(clinicId: string, filePath: string, token: string) {
    return this.files.resolveForServing({ clinicId, filePath, token });
  }

  // ─── Guard ────────────────────────────────────────────────────────────────

  private async assertClaimOwnership(claimId: string, clinicId: string) {
    const claim = await this.prisma.insuranceClaim.findFirst({
      where: { id: claimId, clinic_id: clinicId },
      select: { id: true },
    });
    if (!claim) throw new ForbiddenException('Claim not found or access denied');
  }
}
