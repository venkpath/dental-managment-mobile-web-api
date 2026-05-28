import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import sharp from 'sharp';

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/dicom',
];

const MEDIA_INCLUDE = {
  uploader: { select: { id: true, name: true, role: true } },
} as const;

@Injectable()
export class TreatmentMediaService {
  private readonly logger = new Logger(TreatmentMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async upload(clinicId: string, params: {
    treatmentId: string;
    branchId: string;
    uploadedBy: string;
    mediaType: string;
    visitDate: string;
    caption?: string;
    file: Express.Multer.File;
  }) {
    if (!ALLOWED_MIMES.includes(params.file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${params.file.mimetype}`);
    }

    const treatment = await this.prisma.treatment.findUnique({ where: { id: params.treatmentId } });
    if (!treatment || treatment.clinic_id !== clinicId) {
      throw new NotFoundException('Treatment not found in this clinic');
    }

    const originalSize = params.file.buffer.length;
    let storedBuffer = params.file.buffer;
    let storedMime = params.file.mimetype;
    let storedExt = extname(params.file.originalname).toLowerCase() || '.bin';

    // Compress images before uploading to S3
    if (IMAGE_MIMES.has(params.file.mimetype)) {
      storedBuffer = await sharp(params.file.buffer)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      storedMime = 'image/jpeg';
      storedExt = '.jpg';
    }

    const fileName = `${randomUUID()}${storedExt}`;
    const s3Key = `clinics/${clinicId}/treatment-media/${params.treatmentId}/${fileName}`;
    await this.s3.upload(s3Key, storedBuffer, storedMime);

    const storedSize = storedBuffer.length;
    this.logger.log(
      `TreatmentMedia upload: treatment=${params.treatmentId} type=${params.mediaType} ` +
      `original=${originalSize}B stored=${storedSize}B (${Math.round((1 - storedSize / originalSize) * 100)}% reduction) key=${s3Key}`,
    );

    return this.prisma.treatmentMedia.create({
      data: {
        clinic_id: clinicId,
        branch_id: params.branchId,
        patient_id: treatment.patient_id,
        treatment_id: params.treatmentId,
        file_url: s3Key,
        file_name: fileName,
        original_name: params.file.originalname,
        mime_type: storedMime,
        media_type: params.mediaType,
        original_size: originalSize,
        stored_size: storedSize,
        visit_date: new Date(params.visitDate),
        caption: params.caption,
        uploaded_by: params.uploadedBy,
      },
      include: MEDIA_INCLUDE,
    });
  }

  async findByTreatment(clinicId: string, treatmentId: string) {
    const treatment = await this.prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment || treatment.clinic_id !== clinicId) {
      throw new NotFoundException('Treatment not found in this clinic');
    }

    return this.prisma.treatmentMedia.findMany({
      where: { clinic_id: clinicId, treatment_id: treatmentId },
      orderBy: [{ visit_date: 'desc' }, { created_at: 'desc' }],
      include: MEDIA_INCLUDE,
    });
  }

  async findByPatient(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException('Patient not found in this clinic');
    }

    return this.prisma.treatmentMedia.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      orderBy: [{ visit_date: 'desc' }, { created_at: 'desc' }],
      include: {
        ...MEDIA_INCLUDE,
        treatment: { select: { id: true, procedure: true, status: true } },
      },
    });
  }

  async findById(clinicId: string, id: string) {
    const media = await this.prisma.treatmentMedia.findUnique({ where: { id } });
    if (!media || media.clinic_id !== clinicId) {
      throw new NotFoundException('Media not found');
    }
    return media;
  }

  async getSignedUrl(clinicId: string, id: string): Promise<string> {
    const media = await this.findById(clinicId, id);
    return this.s3.getSignedUrl(media.file_url);
  }

  async remove(clinicId: string, id: string) {
    const media = await this.findById(clinicId, id);
    await this.s3.delete(media.file_url);
    await this.prisma.treatmentMedia.delete({ where: { id } });
    return { deleted: true };
  }
}
