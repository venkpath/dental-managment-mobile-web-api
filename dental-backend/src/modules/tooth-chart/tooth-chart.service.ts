import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateToothConditionDto, UpdateToothConditionDto } from './dto/index.js';
import { PatientToothCondition } from '@prisma/client';

const CONDITION_INCLUDE = {
  tooth: true,
  surface: true,
  dentist: { select: { id: true, name: true, email: true, role: true } },
} as const;

@Injectable()
export class ToothChartService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeeth() {
    return this.prisma.tooth.findMany({ orderBy: { fdi_number: 'asc' } });
  }

  async getSurfaces() {
    return this.prisma.toothSurface.findMany({ orderBy: { name: 'asc' } });
  }

  async getPatientToothChart(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
    }

    const [teeth, surfaces, conditions] = await Promise.all([
      this.prisma.tooth.findMany({ orderBy: { fdi_number: 'asc' } }),
      this.prisma.toothSurface.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.patientToothCondition.findMany({
        where: { clinic_id: clinicId, patient_id: patientId },
        include: CONDITION_INCLUDE,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return { teeth, surfaces, conditions };
  }

  async createCondition(
    clinicId: string,
    dto: CreateToothConditionDto,
  ): Promise<PatientToothCondition> {
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

    const tooth = await this.prisma.tooth.findUnique({
      where: { id: dto.tooth_id },
    });
    if (!tooth) {
      throw new NotFoundException(`Tooth with ID "${dto.tooth_id}" not found`);
    }

    if (dto.surface_id) {
      const surface = await this.prisma.toothSurface.findUnique({
        where: { id: dto.surface_id },
      });
      if (!surface) {
        throw new NotFoundException(`Tooth surface with ID "${dto.surface_id}" not found`);
      }
    }

    const dentist = await this.prisma.user.findUnique({
      where: { id: dto.diagnosed_by },
    });
    if (!dentist || dentist.clinic_id !== clinicId) {
      throw new NotFoundException(`Dentist with ID "${dto.diagnosed_by}" not found in this clinic`);
    }

    return this.prisma.patientToothCondition.create({
      data: {
        ...dto,
        clinic_id: clinicId,
      },
      include: CONDITION_INCLUDE,
    });
  }

  async updateCondition(
    clinicId: string,
    id: string,
    dto: UpdateToothConditionDto,
  ): Promise<PatientToothCondition> {
    const condition = await this.prisma.patientToothCondition.findUnique({
      where: { id },
    });
    if (!condition || condition.clinic_id !== clinicId) {
      throw new NotFoundException(`Tooth condition with ID "${id}" not found`);
    }

    if (dto.surface_id) {
      const surface = await this.prisma.toothSurface.findUnique({
        where: { id: dto.surface_id },
      });
      if (!surface) {
        throw new NotFoundException(`Tooth surface with ID "${dto.surface_id}" not found`);
      }
    }

    return this.prisma.patientToothCondition.update({
      where: { id },
      data: { ...dto },
      include: CONDITION_INCLUDE,
    });
  }
}
