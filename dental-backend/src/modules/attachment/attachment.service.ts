import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateAttachmentDto } from './dto/index.js';
import { Attachment } from '@prisma/client';

const ATTACHMENT_INCLUDE = {
  branch: true,
  patient: true,
  uploader: { select: { id: true, name: true, email: true, role: true } },
} as const;

@Injectable()
export class AttachmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreateAttachmentDto): Promise<Attachment> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branch_id },
    });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patient_id },
    });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
    }

    const uploader = await this.prisma.user.findUnique({
      where: { id: dto.uploaded_by },
    });
    if (!uploader || uploader.clinic_id !== clinicId) {
      throw new NotFoundException(`User with ID "${dto.uploaded_by}" not found in this clinic`);
    }

    return this.prisma.attachment.create({
      data: {
        ...dto,
        clinic_id: clinicId,
      },
      include: ATTACHMENT_INCLUDE,
    });
  }

  async findByPatient(clinicId: string, patientId: string): Promise<Attachment[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
    }

    return this.prisma.attachment.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      orderBy: { created_at: 'desc' },
      include: ATTACHMENT_INCLUDE,
    });
  }
}
