import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ClinicalVisit, TreatmentPlan, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';
import {
  CreateClinicalVisitDto,
  UpdateClinicalVisitDto,
  QueryClinicalVisitDto,
  CreateTreatmentPlanDto,
  UpdateTreatmentPlanDto,
  TreatmentPlanStatus,
} from './dto/index.js';

@Injectable()
export class ClinicalVisitService {
  constructor(private readonly prisma: PrismaService) {}

  // Map treatment procedures to dental chart condition names
  private static readonly PROCEDURE_CONDITION_MAP: Record<string, string> = {
    RCT: 'RCT',
    Extraction: 'Missing',
    Filling: 'Filled',
    Crown: 'Crown',
    Bridge: 'Crown',
    Implant: 'Implant',
  };

  // ────────────────────────────────────────────────────────────
  // Clinical Visits
  // ────────────────────────────────────────────────────────────

  async create(clinicId: string, dto: CreateClinicalVisitDto): Promise<ClinicalVisit> {
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

    if (dto.appointment_id) {
      const appt = await this.prisma.appointment.findUnique({ where: { id: dto.appointment_id } });
      if (!appt || appt.clinic_id !== clinicId) {
        throw new NotFoundException(`Appointment with ID "${dto.appointment_id}" not found in this clinic`);
      }
    }

    const { vital_signs, review_after_date, ...rest } = dto;

    const clinicalVisit = await this.prisma.clinicalVisit.create({
      data: {
        ...rest,
        clinic_id: clinicId,
        ...(review_after_date ? { review_after_date: new Date(review_after_date) } : {}),
        ...(vital_signs !== undefined ? { vital_signs: vital_signs as Prisma.InputJsonValue } : {}),
      },
      include: { patient: true, dentist: true, branch: true, appointment: true },
    });

    // Auto-update appointment status to 'in_progress' when consultation starts
    if (dto.appointment_id) {
      await this.prisma.appointment.update({
        where: { id: dto.appointment_id },
        data: { status: 'in_progress' },
      });
    }

    return clinicalVisit;
  }

  async findAll(clinicId: string, query: QueryClinicalVisitDto): Promise<PaginatedResult<ClinicalVisit>> {
    const where: Prisma.ClinicalVisitWhereInput = { clinic_id: clinicId };

    if (query.patient_id) where.patient_id = query.patient_id;
    if (query.dentist_id) where.dentist_id = query.dentist_id;
    if (query.branch_id) where.branch_id = query.branch_id;
    if (query.appointment_id) where.appointment_id = query.appointment_id;
    if (query.status) where.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.clinicalVisit.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { patient: true, dentist: true, branch: true, appointment: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.clinicalVisit.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string) {
    const visit = await this.prisma.clinicalVisit.findUnique({
      where: { id },
      include: {
        patient: true,
        dentist: true,
        branch: true,
        appointment: true,
        tooth_conditions: { include: { tooth: true, surface: true } },
        treatments: true,
        treatment_plans: { include: { items: true } },
      },
    });
    if (!visit || visit.clinic_id !== clinicId) {
      throw new NotFoundException(`Clinical visit with ID "${id}" not found`);
    }
    return visit;
  }

  async findByPatient(clinicId: string, patientId: string): Promise<ClinicalVisit[]> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    return this.prisma.clinicalVisit.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      orderBy: { created_at: 'desc' },
      include: { dentist: true, branch: true, appointment: true, treatment_plans: true },
    });
  }

  async update(clinicId: string, id: string, dto: UpdateClinicalVisitDto): Promise<ClinicalVisit> {
    await this.findOne(clinicId, id);

    const { vital_signs, soap_notes, review_after_date, ...rest } = dto;

    return this.prisma.clinicalVisit.update({
      where: { id },
      data: {
        ...rest,
        ...(review_after_date !== undefined ? { review_after_date: review_after_date ? new Date(review_after_date) : null } : {}),
        ...(vital_signs !== undefined ? { vital_signs: vital_signs as Prisma.InputJsonValue } : {}),
        ...(soap_notes !== undefined ? { soap_notes: soap_notes as Prisma.InputJsonValue } : {}),
      },
      include: { patient: true, dentist: true, branch: true, appointment: true },
    });
  }

  async finalize(clinicId: string, id: string): Promise<ClinicalVisit> {
    const visit = await this.findOne(clinicId, id);

    if (visit.status === 'finalized') {
      throw new BadRequestException('Visit already finalized');
    }
    if (visit.status === 'cancelled') {
      throw new BadRequestException('Cannot finalize a cancelled visit');
    }

    const updatedVisit = await this.prisma.clinicalVisit.update({
      where: { id },
      data: { status: 'finalized', finalized_at: new Date() },
      include: { patient: true, dentist: true, branch: true, appointment: true },
    });

    // Auto-update appointment status to 'completed' when consultation is finalized
    if (updatedVisit.appointment_id) {
      await this.prisma.appointment.update({
        where: { id: updatedVisit.appointment_id },
        data: { status: 'completed' },
      });
    }

    return updatedVisit;
  }

  async cancel(clinicId: string, id: string): Promise<ClinicalVisit> {
    const visit = await this.findOne(clinicId, id);
    if (visit.status === 'finalized') {
      throw new BadRequestException('Cannot cancel a finalized visit');
    }

    const cancelledVisit = await this.prisma.clinicalVisit.update({
      where: { id },
      data: { status: 'cancelled' },
      include: { patient: true, dentist: true, branch: true, appointment: true },
    });

    // Revert appointment status back to 'scheduled' if it was updated to 'in_progress'
    if (cancelledVisit.appointment_id) {
      await this.prisma.appointment.update({
        where: { id: cancelledVisit.appointment_id },
        data: { status: 'scheduled' },
      });
    }

    return cancelledVisit;
  }

  // ────────────────────────────────────────────────────────────
  // Treatment Plans (nested under a clinical visit, but also queryable standalone)
  // ────────────────────────────────────────────────────────────

  async createPlan(clinicId: string, dto: CreateTreatmentPlanDto): Promise<TreatmentPlan> {
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

    if (dto.clinical_visit_id) {
      const visit = await this.prisma.clinicalVisit.findUnique({ where: { id: dto.clinical_visit_id } });
      if (!visit || visit.clinic_id !== clinicId) {
        throw new NotFoundException(`Clinical visit "${dto.clinical_visit_id}" not found`);
      }
    }

    const totalCost = dto.items.reduce((sum, item) => sum + Number(item.estimated_cost ?? 0), 0);

    return this.prisma.treatmentPlan.create({
      data: {
        clinic_id: clinicId,
        branch_id: dto.branch_id,
        patient_id: dto.patient_id,
        dentist_id: dto.dentist_id,
        ...(dto.clinical_visit_id ? { clinical_visit_id: dto.clinical_visit_id } : {}),
        title: dto.title,
        ...(dto.notes ? { notes: dto.notes } : {}),
        total_estimated_cost: new Prisma.Decimal(totalCost),
        items: {
          create: dto.items.map((item) => ({
            ...(item.tooth_number ? { tooth_number: item.tooth_number } : {}),
            procedure: item.procedure,
            ...(item.diagnosis ? { diagnosis: item.diagnosis } : {}),
            estimated_cost: new Prisma.Decimal(item.estimated_cost),
            ...(item.urgency ? { urgency: item.urgency } : {}),
            ...(item.phase !== undefined ? { phase: item.phase } : {}),
            ...(item.sequence !== undefined ? { sequence: item.sequence } : {}),
            ...(item.notes ? { notes: item.notes } : {}),
          })),
        },
      },
      include: { items: true, patient: true, dentist: true, clinical_visit: true },
    });
  }

  async findOnePlan(clinicId: string, planId: string) {
    const plan = await this.prisma.treatmentPlan.findUnique({
      where: { id: planId },
      include: {
        items: { orderBy: [{ phase: 'asc' }, { sequence: 'asc' }] },
        patient: true,
        dentist: true,
        branch: true,
        clinical_visit: true,
        treatments: true,
      },
    });
    if (!plan || plan.clinic_id !== clinicId) {
      throw new NotFoundException(`Treatment plan "${planId}" not found`);
    }
    return plan;
  }

  async findPlansByPatient(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient "${patientId}" not found`);
    }

    return this.prisma.treatmentPlan.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      orderBy: { created_at: 'desc' },
      include: {
        items: { orderBy: [{ phase: 'asc' }, { sequence: 'asc' }] },
        dentist: true,
      },
    });
  }

  async updatePlan(clinicId: string, planId: string, dto: UpdateTreatmentPlanDto): Promise<TreatmentPlan> {
    await this.findOnePlan(clinicId, planId);
    return this.prisma.treatmentPlan.update({
      where: { id: planId },
      data: { ...dto },
      include: { items: true },
    });
  }

  async deletePlan(clinicId: string, planId: string): Promise<void> {
    await this.findOnePlan(clinicId, planId);
    await this.prisma.treatmentPlan.delete({ where: { id: planId } });
  }

  /**
   * Accept a treatment plan: creates Treatment records for each item and
   * marks each item as "converted". Plan status becomes "accepted".
   */
  async acceptPlan(clinicId: string, planId: string) {
    const plan = await this.findOnePlan(clinicId, planId);

    if (plan.status === TreatmentPlanStatus.ACCEPTED || plan.status === TreatmentPlanStatus.IN_PROGRESS) {
      throw new BadRequestException('Plan is already accepted');
    }
    if (plan.status === TreatmentPlanStatus.COMPLETED || plan.status === TreatmentPlanStatus.CANCELLED) {
      throw new BadRequestException(`Cannot accept a ${plan.status} plan`);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of plan.items) {
        if (item.status === 'converted' && item.treatment_id) continue;

        const treatment = await tx.treatment.create({
          data: {
            clinic_id: plan.clinic_id,
            branch_id: plan.branch_id,
            patient_id: plan.patient_id,
            dentist_id: plan.dentist_id,
            treatment_plan_id: plan.id,
            ...(plan.clinical_visit_id ? { clinical_visit_id: plan.clinical_visit_id } : {}),
            ...(item.tooth_number ? { tooth_number: item.tooth_number } : {}),
            diagnosis: item.diagnosis ?? item.procedure,
            procedure: item.procedure,
            cost: item.estimated_cost,
            status: 'planned',
            ...(item.notes ? { notes: item.notes } : {}),
          },
        });

        // Auto-create tooth condition on dental chart (mirrors TreatmentService.create logic)
        if (item.tooth_number) {
          const conditionName = ClinicalVisitService.PROCEDURE_CONDITION_MAP[item.procedure];
          if (conditionName) {
            const fdiNumbers = item.tooth_number
              .split(',')
              .map((s: string) => parseInt(s.trim(), 10))
              .filter((n: number) => !isNaN(n));

            for (const fdiNumber of fdiNumbers) {
              const tooth = await tx.tooth.findUnique({ where: { fdi_number: fdiNumber } });
              if (tooth) {
                await tx.patientToothCondition.create({
                  data: {
                    clinic_id: plan.clinic_id,
                    branch_id: plan.branch_id,
                    patient_id: plan.patient_id,
                    tooth_id: tooth.id,
                    condition: conditionName,
                    notes: `Auto-recorded from treatment plan: ${item.procedure} — ${item.diagnosis ?? item.procedure}`,
                    diagnosed_by: plan.dentist_id,
                  },
                });
              }
            }
          }
        }

        await tx.treatmentPlanItem.update({
          where: { id: item.id },
          data: { status: 'converted', treatment_id: treatment.id },
        });
      }

      return tx.treatmentPlan.update({
        where: { id: plan.id },
        data: { status: TreatmentPlanStatus.ACCEPTED, accepted_at: new Date() },
        include: {
          items: { orderBy: [{ phase: 'asc' }, { sequence: 'asc' }] },
          treatments: true,
        },
      });
    });
  }
}
