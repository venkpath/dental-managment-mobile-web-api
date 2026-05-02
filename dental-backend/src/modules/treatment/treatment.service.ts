import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateTreatmentDto, UpdateTreatmentDto, QueryTreatmentDto } from './dto/index.js';
import { Treatment, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';

@Injectable()
export class TreatmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimit: PlanLimitService,
  ) {}

  // Map treatment procedures to dental chart condition names
  private static readonly PROCEDURE_CONDITION_MAP: Record<string, string> = {
    RCT: 'RCT',
    Extraction: 'Missing',
    Filling: 'Filled',
    Crown: 'Crown',
    Bridge: 'Crown',
    Implant: 'Implant',
  };

  async create(clinicId: string, dto: CreateTreatmentDto): Promise<Treatment> {
    await this.planLimit.enforceMonthlyCap(clinicId, 'treatments');

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

    const treatment = await this.prisma.treatment.create({
      data: {
        ...dto,
        clinic_id: clinicId,
        cost: new Prisma.Decimal(dto.cost),
      },
      include: { patient: true, dentist: true, branch: true },
    });

    // Auto-create a tooth condition on the dental chart when a tooth-specific procedure is recorded
    // Supports comma-separated tooth numbers (e.g. "35,36,37" for bridge)
    if (dto.tooth_number) {
      const conditionName = TreatmentService.PROCEDURE_CONDITION_MAP[dto.procedure];
      if (conditionName) {
        const fdiNumbers = dto.tooth_number
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));

        for (const fdiNumber of fdiNumbers) {
          const tooth = await this.prisma.tooth.findUnique({ where: { fdi_number: fdiNumber } });
          if (tooth) {
            await this.prisma.patientToothCondition.create({
              data: {
                clinic_id: clinicId,
                branch_id: dto.branch_id,
                patient_id: dto.patient_id,
                tooth_id: tooth.id,
                condition: conditionName,
                notes: `Auto-recorded from treatment: ${dto.procedure} — ${dto.diagnosis}`,
                diagnosed_by: dto.dentist_id,
              },
            });
          }
        }
      }
    }

    return treatment;
  }

  async findAll(clinicId: string, query: QueryTreatmentDto): Promise<PaginatedResult<Treatment>> {
    const where: Prisma.TreatmentWhereInput = { clinic_id: clinicId };

    if (query.patient_id) {
      where.patient_id = query.patient_id;
    }
    if (query.dentist_id) {
      where.dentist_id = query.dentist_id;
    }
    if (query.branch_id) {
      where.branch_id = query.branch_id;
    }
    if (query.status) {
      where.status = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.treatment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { patient: true, dentist: true, branch: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.treatment.count({ where }),
    ]);

    return paginate(data, total, page, limit);
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
