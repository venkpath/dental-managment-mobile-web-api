import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateToothConditionDto, UpdateToothConditionDto } from './dto/index.js';
import { PatientToothCondition } from '@prisma/client';

const CONDITION_INCLUDE = {
  tooth: true,
  surface: true,
  dentist: { select: { id: true, name: true, email: true, role: true } },
} as const;

/** FDI permanent teeth (32 teeth) — reference data required for dental charting */
const TEETH_SEED = [
  { fdi_number: 11, name: 'Upper Right Central Incisor', quadrant: 1, position: 1 },
  { fdi_number: 12, name: 'Upper Right Lateral Incisor', quadrant: 1, position: 2 },
  { fdi_number: 13, name: 'Upper Right Canine', quadrant: 1, position: 3 },
  { fdi_number: 14, name: 'Upper Right First Premolar', quadrant: 1, position: 4 },
  { fdi_number: 15, name: 'Upper Right Second Premolar', quadrant: 1, position: 5 },
  { fdi_number: 16, name: 'Upper Right First Molar', quadrant: 1, position: 6 },
  { fdi_number: 17, name: 'Upper Right Second Molar', quadrant: 1, position: 7 },
  { fdi_number: 18, name: 'Upper Right Third Molar', quadrant: 1, position: 8 },
  { fdi_number: 21, name: 'Upper Left Central Incisor', quadrant: 2, position: 1 },
  { fdi_number: 22, name: 'Upper Left Lateral Incisor', quadrant: 2, position: 2 },
  { fdi_number: 23, name: 'Upper Left Canine', quadrant: 2, position: 3 },
  { fdi_number: 24, name: 'Upper Left First Premolar', quadrant: 2, position: 4 },
  { fdi_number: 25, name: 'Upper Left Second Premolar', quadrant: 2, position: 5 },
  { fdi_number: 26, name: 'Upper Left First Molar', quadrant: 2, position: 6 },
  { fdi_number: 27, name: 'Upper Left Second Molar', quadrant: 2, position: 7 },
  { fdi_number: 28, name: 'Upper Left Third Molar', quadrant: 2, position: 8 },
  { fdi_number: 31, name: 'Lower Left Central Incisor', quadrant: 3, position: 1 },
  { fdi_number: 32, name: 'Lower Left Lateral Incisor', quadrant: 3, position: 2 },
  { fdi_number: 33, name: 'Lower Left Canine', quadrant: 3, position: 3 },
  { fdi_number: 34, name: 'Lower Left First Premolar', quadrant: 3, position: 4 },
  { fdi_number: 35, name: 'Lower Left Second Premolar', quadrant: 3, position: 5 },
  { fdi_number: 36, name: 'Lower Left First Molar', quadrant: 3, position: 6 },
  { fdi_number: 37, name: 'Lower Left Second Molar', quadrant: 3, position: 7 },
  { fdi_number: 38, name: 'Lower Left Third Molar', quadrant: 3, position: 8 },
  { fdi_number: 41, name: 'Lower Right Central Incisor', quadrant: 4, position: 1 },
  { fdi_number: 42, name: 'Lower Right Lateral Incisor', quadrant: 4, position: 2 },
  { fdi_number: 43, name: 'Lower Right Canine', quadrant: 4, position: 3 },
  { fdi_number: 44, name: 'Lower Right First Premolar', quadrant: 4, position: 4 },
  { fdi_number: 45, name: 'Lower Right Second Premolar', quadrant: 4, position: 5 },
  { fdi_number: 46, name: 'Lower Right First Molar', quadrant: 4, position: 6 },
  { fdi_number: 47, name: 'Lower Right Second Molar', quadrant: 4, position: 7 },
  { fdi_number: 48, name: 'Lower Right Third Molar', quadrant: 4, position: 8 },
];

const SURFACES_SEED = [
  { name: 'Mesial', code: 'M' },
  { name: 'Distal', code: 'D' },
  { name: 'Buccal', code: 'B' },
  { name: 'Lingual', code: 'L' },
  { name: 'Occlusal', code: 'O' },
];

@Injectable()
export class ToothChartService implements OnModuleInit {
  private readonly logger = new Logger(ToothChartService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Auto-seed teeth & surfaces reference data if tables are empty */
  async onModuleInit() {
    try {
      const teethCount = await this.prisma.tooth.count();
      if (teethCount === 0) {
        for (const t of TEETH_SEED) {
          await this.prisma.tooth.upsert({
            where: { fdi_number: t.fdi_number },
            update: {},
            create: t,
          });
        }
        this.logger.log('Auto-seeded 32 FDI teeth reference data');
      }

      const surfaceCount = await this.prisma.toothSurface.count();
      if (surfaceCount === 0) {
        for (const s of SURFACES_SEED) {
          await this.prisma.toothSurface.upsert({
            where: { name: s.name },
            update: {},
            create: s,
          });
        }
        this.logger.log('Auto-seeded 5 tooth surfaces reference data');
      }
    } catch (err) {
      this.logger.warn('Failed to auto-seed tooth reference data', err);
    }
  }

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

    const [teeth, surfaces, conditions, treatments] = await Promise.all([
      this.prisma.tooth.findMany({ orderBy: { fdi_number: 'asc' } }),
      this.prisma.toothSurface.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.patientToothCondition.findMany({
        where: { clinic_id: clinicId, patient_id: patientId },
        include: CONDITION_INCLUDE,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.treatment.findMany({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          tooth_number: { not: null },
        },
        include: { dentist: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return { teeth, surfaces, conditions, treatments };
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
