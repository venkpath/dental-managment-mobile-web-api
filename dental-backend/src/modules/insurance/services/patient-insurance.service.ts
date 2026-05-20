import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { InsuranceFileService } from './insurance-file.service.js';
import { InsuranceStrategyFactory } from '../strategies/strategy.factory.js';
import type { CreatePatientInsuranceDto } from '../dto/create-patient-insurance.dto.js';
import type { UpdatePatientInsuranceDto } from '../dto/update-patient-insurance.dto.js';

const insuranceInclude = {
  plan: {
    include: {
      provider: { select: { id: true, name: true, short_code: true, type: true, country: true, claim_method: true } },
      // Count of rate-card procedure codes seeded for this plan. Used by
      // the frontend to decide whether to surface the "View rate card" /
      // "Lookup rate" affordances (AP EHS today; others when seeded).
      _count: { select: { procedure_codes: true } },
    },
  },
} as const;

/**
 * Stage 1 of the lifecycle — patient's insurance / EHS enrollments. A patient
 * can hold multiple rows (primary + secondary for COB). Card scans and
 * referral letters are uploaded into one of three named slots.
 */
@Injectable()
export class PatientInsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: InsuranceFileService,
    private readonly strategyFactory: InsuranceStrategyFactory,
  ) {}

  async list(clinicId: string, patientId: string) {
    await this.ensurePatient(clinicId, patientId);
    return this.prisma.patientInsurance.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      include: insuranceInclude,
      orderBy: [{ priority: 'asc' }, { created_at: 'desc' }],
    });
  }

  async get(clinicId: string, id: string) {
    const row = await this.prisma.patientInsurance.findUnique({
      where: { id },
      include: insuranceInclude,
    });
    if (!row || row.clinic_id !== clinicId) {
      throw new NotFoundException('Patient insurance not found');
    }
    return row;
  }

  async create(clinicId: string, patientId: string, dto: CreatePatientInsuranceDto) {
    await this.ensurePatient(clinicId, patientId);
    await this.ensurePlanVisible(clinicId, dto.plan_id);

    return this.prisma.patientInsurance.create({
      data: {
        clinic_id: clinicId,
        patient_id: patientId,
        plan_id: dto.plan_id,
        priority: dto.priority ?? 1,
        member_id: dto.member_id,
        group_number: dto.group_number,
        employee_id: dto.employee_id,
        beneficiary_id: dto.beneficiary_id,
        company_name: dto.company_name,
        subscriber_name: dto.subscriber_name,
        relationship: dto.relationship,
        coverage_start: dto.coverage_start ? new Date(dto.coverage_start) : null,
        coverage_end: dto.coverage_end ? new Date(dto.coverage_end) : null,
        is_active: dto.is_active ?? true,
        notes: dto.notes,
      },
      include: insuranceInclude,
    });
  }

  async update(clinicId: string, id: string, dto: UpdatePatientInsuranceDto) {
    const existing = await this.get(clinicId, id);
    if (dto.plan_id) await this.ensurePlanVisible(clinicId, dto.plan_id);

    return this.prisma.patientInsurance.update({
      where: { id: existing.id },
      data: {
        plan_id: dto.plan_id ?? undefined,
        priority: dto.priority ?? undefined,
        member_id: dto.member_id ?? undefined,
        group_number: dto.group_number ?? undefined,
        employee_id: dto.employee_id ?? undefined,
        beneficiary_id: dto.beneficiary_id ?? undefined,
        company_name: dto.company_name ?? undefined,
        subscriber_name: dto.subscriber_name ?? undefined,
        relationship: dto.relationship ?? undefined,
        coverage_start: dto.coverage_start !== undefined ? (dto.coverage_start ? new Date(dto.coverage_start) : null) : undefined,
        coverage_end: dto.coverage_end !== undefined ? (dto.coverage_end ? new Date(dto.coverage_end) : null) : undefined,
        is_active: dto.is_active ?? undefined,
        notes: dto.notes ?? undefined,
      },
      include: insuranceInclude,
    });
  }

  async remove(clinicId: string, id: string) {
    const existing = await this.get(clinicId, id);
    await Promise.all([
      this.files.remove(existing.card_front_url),
      this.files.remove(existing.card_back_url),
      this.files.remove(existing.referral_letter_url),
    ]);
    await this.prisma.patientInsurance.delete({ where: { id: existing.id } });
    return { deleted: true };
  }

  /** Replace a card scan / referral letter file slot. */
  async uploadDocument(
    clinicId: string,
    id: string,
    slot: 'card_front' | 'card_back' | 'referral_letter',
    file: Express.Multer.File,
  ) {
    const existing = await this.get(clinicId, id);
    const saved = await this.files.save({ clinicId, subdir: 'patient-cards', file });

    const fieldBySlot = {
      card_front: 'card_front_url',
      card_back: 'card_back_url',
      referral_letter: 'referral_letter_url',
    } as const;
    const field = fieldBySlot[slot];
    if (!field) throw new BadRequestException(`Invalid document slot: ${slot}`);

    const previous = (existing as Record<string, unknown>)[field] as string | null;
    const updated = await this.prisma.patientInsurance.update({
      where: { id: existing.id },
      data: { [field]: saved.file_url },
      include: insuranceInclude,
    });
    if (previous) await this.files.remove(previous);
    return updated;
  }

  /**
   * Stage 5 of the lifecycle — compute the per-line insurance vs patient
   * breakdown for a set of invoice items under a given patient enrollment.
   * Used by the invoice form for live preview and by `invoice.create()` when
   * persisting an insured invoice.
   *
   * `items` carry per-line clinic rate + a coverage category. Category is
   * what tells the strategy whether to apply preventive/basic/major/ortho
   * coverage %. Pure read — no DB writes.
   */
  async previewCoverage(
    clinicId: string,
    patientInsuranceId: string,
    items: Array<{
      description: string;
      category: 'preventive' | 'basic' | 'major' | 'ortho' | 'emergency';
      clinic_rate: number;
      scheme_max_fee?: number | null;
      quantity?: number;
    }>,
  ) {
    const enrollment = await this.get(clinicId, patientInsuranceId);
    const plan = enrollment.plan;
    const provider = plan.provider;

    const strategy = this.strategyFactory.get(provider.country);
    const breakdown = strategy.calculateCoverage({
      plan: {
        currency: plan.currency,
        preventive_coverage: plan.preventive_coverage,
        basic_coverage: plan.basic_coverage,
        major_coverage: plan.major_coverage,
        ortho_coverage: plan.ortho_coverage,
        annual_max_amount: plan.annual_max_amount,
        deductible_amount: plan.deductible_amount,
        requires_preauth: plan.requires_preauth,
        requires_referral: plan.requires_referral,
        coverage_rules: plan.coverage_rules,
        provider_country: provider.country,
        provider_short_code: provider.short_code,
      },
      items,
    });
    return {
      enrollment_id: enrollment.id,
      provider: { id: provider.id, name: provider.name, short_code: provider.short_code, country: provider.country },
      plan: { id: plan.id, name: plan.plan_name, currency: plan.currency },
      ...breakdown,
    };
  }

  /**
   * Stage 2 of the lifecycle — quick eligibility check the appointment /
   * invoice screens use to render the "Patient is covered under X" banner.
   * Delegates the country-specific reasoning to the strategy.
   */
  async checkEligibility(clinicId: string, patientInsuranceId: string) {
    const enrollment = await this.get(clinicId, patientInsuranceId);
    const plan = enrollment.plan;
    const provider = plan.provider;

    const empanelment = await this.prisma.clinicEmpanelment.findUnique({
      where: { clinic_id_provider_id: { clinic_id: clinicId, provider_id: provider.id } },
    });

    const strategy = this.strategyFactory.get(provider.country);
    const result = strategy.checkEligibility({
      plan: {
        currency: plan.currency,
        preventive_coverage: plan.preventive_coverage,
        basic_coverage: plan.basic_coverage,
        major_coverage: plan.major_coverage,
        ortho_coverage: plan.ortho_coverage,
        annual_max_amount: plan.annual_max_amount,
        deductible_amount: plan.deductible_amount,
        requires_preauth: plan.requires_preauth,
        requires_referral: plan.requires_referral,
        coverage_rules: plan.coverage_rules,
        provider_country: provider.country,
        provider_short_code: provider.short_code,
      },
      patientCoverageStart: enrollment.coverage_start,
      patientCoverageEnd: enrollment.coverage_end,
      clinicEmpanelmentStatus: empanelment?.status ?? null,
      clinicEmpanelmentValidTo: empanelment?.valid_to ?? null,
    });

    return {
      enrollment_id: enrollment.id,
      provider: { id: provider.id, name: provider.name, short_code: provider.short_code, country: provider.country },
      plan: { id: plan.id, name: plan.plan_name, currency: plan.currency },
      clinic_empanelled: !!empanelment && empanelment.status === 'ACTIVE',
      empanelment_number: empanelment?.empanelment_number ?? null,
      ...result,
    };
  }

  private async ensurePatient(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException('Patient not found in this clinic');
    }
  }

  private async ensurePlanVisible(clinicId: string, planId: string) {
    const plan = await this.prisma.insurancePlan.findUnique({
      where: { id: planId },
      include: { provider: true },
    });
    if (!plan) throw new NotFoundException('Insurance plan not found');
    if (plan.provider.clinic_id !== null && plan.provider.clinic_id !== clinicId) {
      throw new NotFoundException('Insurance plan not found');
    }
    if (!plan.is_active) {
      throw new BadRequestException('Insurance plan is inactive');
    }
  }
}
