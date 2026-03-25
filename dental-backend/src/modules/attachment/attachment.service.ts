import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { randomUUID } from 'crypto';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, extname } from 'path';

const ATTACHMENT_INCLUDE = {
  branch: { select: { id: true, name: true } },
  patient: { select: { id: true, first_name: true, last_name: true } },
  uploader: { select: { id: true, name: true, email: true, role: true } },
} as const;

const UPLOAD_DIR = 'uploads/attachments';

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
  constructor(private readonly prisma: PrismaService) {}

  async uploadFile(clinicId: string, params: {
    patientId: string;
    branchId: string;
    uploadedBy: string;
    type: string;
    file: Express.Multer.File;
  }) {
    // Validate branch belongs to clinic
    const branch = await this.prisma.branch.findUnique({ where: { id: params.branchId } });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException('Branch not found in this clinic');
    }

    // Validate patient belongs to clinic
    const patient = await this.prisma.patient.findUnique({ where: { id: params.patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException('Patient not found in this clinic');
    }

    // Save file to disk
    const ext = extname(params.file.originalname) || '.bin';
    const fileName = `${randomUUID()}${ext}`;
    const dir = `${UPLOAD_DIR}/${clinicId}`;
    await mkdir(join(process.cwd(), dir), { recursive: true });
    const filePath = `${dir}/${fileName}`;
    await writeFile(join(process.cwd(), filePath), params.file.buffer);

    // Create DB record
    this.logger.log(`Creating attachment: clinic=${clinicId}, patient=${params.patientId}, branch=${params.branchId}, user=${params.uploadedBy}, type=${params.type}, file=${filePath}`);
    return this.prisma.attachment.create({
      data: {
        clinic_id: clinicId,
        branch_id: params.branchId,
        patient_id: params.patientId,
        uploaded_by: params.uploadedBy,
        type: params.type,
        file_url: filePath,
        file_name: fileName,
        original_name: params.file.originalname,
        mime_type: params.file.mimetype,
      },
      include: ATTACHMENT_INCLUDE,
    });
  }

  async findByPatient(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException('Patient not found in this clinic');
    }

    return this.prisma.attachment.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      orderBy: { created_at: 'desc' },
      include: ATTACHMENT_INCLUDE,
    });
  }

  async findById(clinicId: string, id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment || attachment.clinic_id !== clinicId) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }

  async updateAnalysis(clinicId: string, id: string, analysis: Record<string, unknown>) {
    const attachment = await this.findById(clinicId, id);
    return this.prisma.attachment.update({
      where: { id: attachment.id },
      data: { ai_analysis: analysis as never },
      include: ATTACHMENT_INCLUDE,
    });
  }

  async remove(clinicId: string, id: string) {
    const attachment = await this.findById(clinicId, id);
    // Try to delete file from disk
    try {
      await unlink(join(process.cwd(), attachment.file_url));
    } catch { /* file may already be gone */ }

    await this.prisma.attachment.delete({ where: { id: attachment.id } });
    return { deleted: true };
  }
}
