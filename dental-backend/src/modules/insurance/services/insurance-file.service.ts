import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, resolve } from 'path';

const UPLOAD_ROOT = 'uploads/insurance';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/zip',
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Shared file storage for insurance-related uploads:
 *  - clinic empanelment certificate / CGHS rate card / TPA MoU
 *  - patient insurance card scans (front / back) and referral letters
 *  - claim attachments (X-rays, consent forms, EOBs, query responses)
 *
 * Files live under `uploads/insurance/<clinic_id>/<subdir>/<uuid><ext>`.
 * The returned `file_url` is the *relative* path stored in the DB; the
 * downloadable URL is built by `buildDownloadUrl(...)` which signs a short-
 * lived JWT — same pattern as the Attachment module.
 */
@Injectable()
export class InsuranceFileService {
  private readonly logger = new Logger(InsuranceFileService.name);

  constructor(private readonly jwt: JwtService) {}

  /** Validate + persist a multer file to local disk. Returns the saved path. */
  async save(params: {
    clinicId: string;
    subdir: string;            // 'empanelment' | 'patient-cards' | 'claim-attachments' | 'preauth'
    file: Express.Multer.File;
  }): Promise<{ file_url: string; file_name: string; original_name: string; mime_type: string; size_bytes: number }> {
    const { clinicId, subdir, file } = params;
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`);
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (!/^[a-z0-9-]+$/i.test(subdir)) {
      throw new BadRequestException('Invalid storage subdir');
    }

    const ext = extname(file.originalname) || '.bin';
    const fileName = `${randomUUID()}${ext}`;
    const dir = `${UPLOAD_ROOT}/${clinicId}/${subdir}`;
    await mkdir(join(process.cwd(), dir), { recursive: true });
    const filePath = `${dir}/${fileName}`;
    await writeFile(join(process.cwd(), filePath), file.buffer);

    this.logger.log(`Saved insurance file: clinic=${clinicId} subdir=${subdir} path=${filePath}`);

    return {
      file_url: filePath,
      file_name: fileName,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
    };
  }

  /** Delete a file from disk. Swallows missing-file errors. */
  async remove(filePath: string | null | undefined): Promise<void> {
    if (!filePath) return;
    try {
      const abs = this.resolveSafe(filePath);
      await unlink(abs);
    } catch {
      /* file already gone — ignore */
    }
  }

  /**
   * Build a short-lived signed URL the frontend can use to view/download a
   * file. The route handler verifies the token + clinic match before
   * streaming the file.
   */
  buildDownloadUrl(params: { clinicId: string; filePath: string; expiresInSec?: number }): { token: string } {
    const token = this.jwt.sign(
      { clinic_id: params.clinicId, file: params.filePath },
      { expiresIn: params.expiresInSec ?? 3600 },
    );
    return { token };
  }

  /**
   * Resolve a stored relative path to its absolute filesystem location and
   * defend against path traversal. Throws if the path escapes the uploads
   * root or the file does not exist.
   */
  resolveForServing(params: { clinicId: string; filePath: string; token: string }): string {
    let payload: { clinic_id?: string; file?: string };
    try {
      payload = this.jwt.verify(params.token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.clinic_id !== params.clinicId || payload.file !== params.filePath) {
      throw new UnauthorizedException('Token does not match the requested file');
    }

    const abs = this.resolveSafe(params.filePath);
    if (!existsSync(abs)) throw new NotFoundException('File not found on disk');
    return abs;
  }

  private resolveSafe(filePath: string): string {
    const uploadsBase = resolve(process.cwd(), 'uploads');
    const abs = resolve(process.cwd(), filePath);
    if (!abs.startsWith(uploadsBase)) {
      throw new BadRequestException('Invalid file path');
    }
    return abs;
  }
}
