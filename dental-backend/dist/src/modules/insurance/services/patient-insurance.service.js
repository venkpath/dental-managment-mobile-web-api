"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientInsuranceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../../database/prisma.service.js");
const insurance_file_service_js_1 = require("./insurance-file.service.js");
const strategy_factory_js_1 = require("../strategies/strategy.factory.js");
const insuranceInclude = {
    plan: {
        include: {
            provider: { select: { id: true, name: true, short_code: true, type: true, country: true, claim_method: true } },
            _count: { select: { procedure_codes: true } },
        },
    },
};
let PatientInsuranceService = class PatientInsuranceService {
    prisma;
    files;
    strategyFactory;
    constructor(prisma, files, strategyFactory) {
        this.prisma = prisma;
        this.files = files;
        this.strategyFactory = strategyFactory;
    }
    async list(clinicId, patientId) {
        await this.ensurePatient(clinicId, patientId);
        return this.prisma.patientInsurance.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            include: insuranceInclude,
            orderBy: [{ priority: 'asc' }, { created_at: 'desc' }],
        });
    }
    async get(clinicId, id) {
        const row = await this.prisma.patientInsurance.findUnique({
            where: { id },
            include: insuranceInclude,
        });
        if (!row || row.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Patient insurance not found');
        }
        return row;
    }
    async create(clinicId, patientId, dto) {
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
    async update(clinicId, id, dto) {
        const existing = await this.get(clinicId, id);
        if (dto.plan_id)
            await this.ensurePlanVisible(clinicId, dto.plan_id);
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
    async remove(clinicId, id) {
        const existing = await this.get(clinicId, id);
        await Promise.all([
            this.files.remove(existing.card_front_url),
            this.files.remove(existing.card_back_url),
            this.files.remove(existing.referral_letter_url),
        ]);
        await this.prisma.patientInsurance.delete({ where: { id: existing.id } });
        return { deleted: true };
    }
    async uploadDocument(clinicId, id, slot, file) {
        const existing = await this.get(clinicId, id);
        const saved = await this.files.save({ clinicId, subdir: 'patient-cards', file });
        const fieldBySlot = {
            card_front: 'card_front_url',
            card_back: 'card_back_url',
            referral_letter: 'referral_letter_url',
        };
        const field = fieldBySlot[slot];
        if (!field)
            throw new common_1.BadRequestException(`Invalid document slot: ${slot}`);
        const previous = existing[field];
        const updated = await this.prisma.patientInsurance.update({
            where: { id: existing.id },
            data: { [field]: saved.file_url },
            include: insuranceInclude,
        });
        if (previous)
            await this.files.remove(previous);
        return updated;
    }
    async previewCoverage(clinicId, patientInsuranceId, items) {
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
    async checkEligibility(clinicId, patientInsuranceId) {
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
    async ensurePatient(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Patient not found in this clinic');
        }
    }
    async ensurePlanVisible(clinicId, planId) {
        const plan = await this.prisma.insurancePlan.findUnique({
            where: { id: planId },
            include: { provider: true },
        });
        if (!plan)
            throw new common_1.NotFoundException('Insurance plan not found');
        if (plan.provider.clinic_id !== null && plan.provider.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Insurance plan not found');
        }
        if (!plan.is_active) {
            throw new common_1.BadRequestException('Insurance plan is inactive');
        }
    }
};
exports.PatientInsuranceService = PatientInsuranceService;
exports.PatientInsuranceService = PatientInsuranceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        insurance_file_service_js_1.InsuranceFileService,
        strategy_factory_js_1.InsuranceStrategyFactory])
], PatientInsuranceService);
//# sourceMappingURL=patient-insurance.service.js.map