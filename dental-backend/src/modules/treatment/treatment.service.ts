import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateTreatmentDto, UpdateTreatmentDto, QueryTreatmentDto } from './dto/index.js';
import { Treatment, Prisma } from '@prisma/client';

@Injectable()
export class TreatmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreateTreatmentDto): Promise<Treatment> {
    const [branch, patient, dentist] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
      this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
      this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
    ]);

    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
    }
    if (!dentist || dentist.clinic_id !== clinicId) {
      throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
    }

    return this.prisma.treatment.create({
      data: {
        ...dto,
        clinic_id: clinicId,
        cost: new Prisma.Decimal(dto.cost),
      },
      include: { patient: true, dentist: true, branch: true },
    });
  }

  async findAll(clinicId: string, query: QueryTreatmentDto): Promise<Treatment[]> {
    const where: Prisma.TreatmentWhereInput = { clinic_id: clinicId };

    if (query.dentist_id) {
      where.dentist_id = query.dentist_id;
    }
    if (query.branch_id) {
      where.branch_id = query.branch_id;
    }
    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.treatment.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { patient: true, dentist: true, branch: true },
    });
  }

  async findByPatient(clinicId: string, patientId: string): Promise<Treatment[]> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    return this.prisma.treatment.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      orderBy: { created_at: 'desc' },
      include: { dentist: true, branch: true },
    });
  }

  async findOne(clinicId: string, id: string): Promise<Treatment> {
    const treatment = await this.prisma.treatment.findUnique({
      where: { id },
      include: { patient: true, dentist: true, branch: true },
    });
    if (!treatment || treatment.clinic_id !== clinicId) {
      throw new NotFoundException(`Treatment with ID "${id}" not found`);
    }
    return treatment;
  }

  async update(clinicId: string, id: string, dto: UpdateTreatmentDto): Promise<Treatment> {
    await this.findOne(clinicId, id);

    if (dto.dentist_id) {
      const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
      if (!dentist || dentist.clinic_id !== clinicId) {
        throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
      }
    }

    const { cost, ...rest } = dto;
    return this.prisma.treatment.update({
      where: { id },
      data: {
        ...rest,
        ...(cost !== undefined ? { cost: new Prisma.Decimal(cost) } : {}),
      },
      include: { patient: true, dentist: true, branch: true },
    });
  }
}
