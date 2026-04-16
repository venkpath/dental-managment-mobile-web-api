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
exports.MembershipService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const membershipPlanInclude = {
    benefits: {
        orderBy: { display_order: 'asc' },
    },
    _count: {
        select: { enrollments: true },
    },
};
const membershipEnrollmentInclude = {
    membership_plan: {
        include: {
            benefits: { orderBy: { display_order: 'asc' } },
        },
    },
    primary_patient: true,
    branch: true,
    members: {
        include: {
            patient: true,
        },
        orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    },
    usages: {
        include: {
            benefit: true,
            patient: true,
            treatment: true,
            invoice: true,
        },
        orderBy: { used_on: 'desc' },
    },
};
let MembershipService = class MembershipService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPlan(clinicId, dto) {
        await this.ensurePlanUniqueness(clinicId, dto.name, dto.code);
        return this.prisma.membershipPlan.create({
            data: {
                clinic_id: clinicId,
                code: dto.code,
                name: dto.name,
                description: dto.description,
                category: dto.category,
                price: new client_1.Prisma.Decimal(dto.price ?? 0),
                duration_months: dto.duration_months ?? 12,
                covered_members_limit: dto.covered_members_limit ?? 1,
                grace_period_days: dto.grace_period_days ?? 0,
                is_active: dto.is_active ?? true,
                terms_and_conditions: dto.terms_and_conditions,
                benefits: {
                    create: dto.benefits.map((benefit, index) => ({
                        title: benefit.title,
                        description: benefit.description,
                        benefit_type: benefit.benefit_type,
                        treatment_label: benefit.treatment_label,
                        coverage_scope: benefit.coverage_scope ?? 'shared',
                        included_quantity: benefit.included_quantity,
                        discount_percentage: this.decimalOrUndefined(benefit.discount_percentage),
                        discount_amount: this.decimalOrUndefined(benefit.discount_amount),
                        credit_amount: this.decimalOrUndefined(benefit.credit_amount),
                        display_order: benefit.display_order ?? index,
                        is_active: benefit.is_active ?? true,
                    })),
                },
            },
            include: membershipPlanInclude,
        });
    }
    async findAllPlans(clinicId) {
        return this.prisma.membershipPlan.findMany({
            where: { clinic_id: clinicId },
            include: membershipPlanInclude,
            orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
        });
    }
    async updatePlan(clinicId, id, dto) {
        const existing = await this.findOnePlan(clinicId, id);
        if (dto.name || dto.code !== undefined) {
            await this.ensurePlanUniqueness(clinicId, dto.name ?? existing.name, dto.code ?? existing.code ?? undefined, id);
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.benefits) {
                await tx.membershipBenefit.deleteMany({ where: { membership_plan_id: id } });
            }
            return tx.membershipPlan.update({
                where: { id },
                data: {
                    code: dto.code,
                    name: dto.name,
                    description: dto.description,
                    category: dto.category,
                    price: dto.price !== undefined ? new client_1.Prisma.Decimal(dto.price) : undefined,
                    duration_months: dto.duration_months,
                    covered_members_limit: dto.covered_members_limit,
                    grace_period_days: dto.grace_period_days,
                    is_active: dto.is_active,
                    terms_and_conditions: dto.terms_and_conditions,
                    benefits: dto.benefits
                        ? {
                            create: dto.benefits.map((benefit, index) => ({
                                title: benefit.title,
                                description: benefit.description,
                                benefit_type: benefit.benefit_type,
                                treatment_label: benefit.treatment_label,
                                coverage_scope: benefit.coverage_scope ?? 'shared',
                                included_quantity: benefit.included_quantity,
                                discount_percentage: this.decimalOrUndefined(benefit.discount_percentage),
                                discount_amount: this.decimalOrUndefined(benefit.discount_amount),
                                credit_amount: this.decimalOrUndefined(benefit.credit_amount),
                                display_order: benefit.display_order ?? index,
                                is_active: benefit.is_active ?? true,
                            })),
                        }
                        : undefined,
                },
                include: membershipPlanInclude,
            });
        });
    }
    async listEnrollments(clinicId, query) {
        return this.prisma.membershipEnrollment.findMany({
            where: {
                clinic_id: clinicId,
                branch_id: query.branch_id,
                status: query.status,
                ...(query.patient_id
                    ? {
                        OR: [
                            { primary_patient_id: query.patient_id },
                            { members: { some: { patient_id: query.patient_id } } },
                        ],
                    }
                    : {}),
            },
            include: membershipEnrollmentInclude,
            orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
        });
    }
    async createEnrollment(clinicId, dto) {
        const [branch, membershipPlan, primaryPatient] = await Promise.all([
            this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
            this.prisma.membershipPlan.findUnique({ where: { id: dto.membership_plan_id }, include: { benefits: true } }),
            this.prisma.patient.findUnique({ where: { id: dto.primary_patient_id } }),
        ]);
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        if (!membershipPlan || membershipPlan.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Membership plan with ID "${dto.membership_plan_id}" not found in this clinic`);
        }
        if (!membershipPlan.is_active) {
            throw new common_1.BadRequestException('Cannot enroll patients into an inactive membership plan');
        }
        if (!primaryPatient || primaryPatient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.primary_patient_id}" not found in this clinic`);
        }
        const requestedMembers = dto.members ?? [];
        const coveredMembers = new Map();
        coveredMembers.set(dto.primary_patient_id, { relation_label: 'Self', is_primary: true });
        for (const member of requestedMembers) {
            coveredMembers.set(member.patient_id, {
                relation_label: member.relation_label,
                is_primary: member.patient_id === dto.primary_patient_id,
            });
        }
        if (coveredMembers.size > membershipPlan.covered_members_limit) {
            throw new common_1.BadRequestException(`This membership allows only ${membershipPlan.covered_members_limit} covered member(s).`);
        }
        const patients = await this.prisma.patient.findMany({
            where: {
                id: { in: [...coveredMembers.keys()] },
                clinic_id: clinicId,
            },
            select: { id: true },
        });
        if (patients.length !== coveredMembers.size) {
            throw new common_1.BadRequestException('One or more covered members do not belong to this clinic');
        }
        const startDate = new Date(dto.start_date);
        const endDate = dto.end_date
            ? new Date(dto.end_date)
            : this.calculateEndDate(startDate, membershipPlan.duration_months, membershipPlan.grace_period_days);
        if (endDate <= startDate) {
            throw new common_1.BadRequestException('end_date must be after start_date');
        }
        return this.prisma.membershipEnrollment.create({
            data: {
                clinic_id: clinicId,
                branch_id: dto.branch_id,
                membership_plan_id: dto.membership_plan_id,
                primary_patient_id: dto.primary_patient_id,
                enrollment_number: this.generateEnrollmentNumber(),
                start_date: startDate,
                end_date: endDate,
                amount_paid: new client_1.Prisma.Decimal(dto.amount_paid ?? Number(membershipPlan.price)),
                notes: dto.notes,
                members: {
                    create: [...coveredMembers.entries()].map(([patientId, member]) => ({
                        patient_id: patientId,
                        relation_label: member.relation_label,
                        is_primary: member.is_primary,
                    })),
                },
            },
            include: membershipEnrollmentInclude,
        });
    }
    async updateEnrollment(clinicId, id, dto) {
        const enrollment = await this.findOneEnrollment(clinicId, id);
        const nextStartDate = dto.start_date ? new Date(dto.start_date) : enrollment.start_date;
        const nextEndDate = dto.end_date ? new Date(dto.end_date) : enrollment.end_date;
        if (nextEndDate <= nextStartDate) {
            throw new common_1.BadRequestException('end_date must be after start_date');
        }
        return this.prisma.membershipEnrollment.update({
            where: { id },
            data: {
                status: dto.status,
                start_date: dto.start_date ? new Date(dto.start_date) : undefined,
                end_date: dto.end_date ? new Date(dto.end_date) : undefined,
                amount_paid: dto.amount_paid !== undefined ? new client_1.Prisma.Decimal(dto.amount_paid) : undefined,
                notes: dto.notes,
            },
            include: membershipEnrollmentInclude,
        });
    }
    async recordUsage(clinicId, enrollmentId, dto) {
        const enrollment = await this.findOneEnrollment(clinicId, enrollmentId);
        const memberIds = new Set(enrollment.members.map((member) => member.patient_id));
        if (!memberIds.has(dto.patient_id)) {
            throw new common_1.BadRequestException('Selected patient is not covered under this membership enrollment');
        }
        const benefit = enrollment.membership_plan.benefits.find((item) => item.id === dto.membership_benefit_id);
        if (!benefit) {
            throw new common_1.NotFoundException('Membership benefit not found in this enrollment');
        }
        const usedOn = dto.used_on ? new Date(dto.used_on) : new Date();
        if (usedOn < enrollment.start_date || usedOn > enrollment.end_date) {
            throw new common_1.BadRequestException('Benefit usage must fall within the enrollment validity period');
        }
        const usageQuantity = dto.quantity_used ?? 1;
        const remaining = await this.getRemainingQuantity(enrollmentId, benefit, dto.patient_id);
        if (remaining !== null && usageQuantity > remaining) {
            throw new common_1.BadRequestException(`Only ${remaining} usage(s) remaining for this benefit`);
        }
        if (dto.treatment_id) {
            const treatment = await this.prisma.treatment.findUnique({ where: { id: dto.treatment_id } });
            if (!treatment || treatment.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Treatment with ID "${dto.treatment_id}" not found in this clinic`);
            }
        }
        if (dto.invoice_id) {
            const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoice_id } });
            if (!invoice || invoice.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Invoice with ID "${dto.invoice_id}" not found in this clinic`);
            }
        }
        return this.prisma.membershipBenefitUsage.create({
            data: {
                clinic_id: clinicId,
                membership_enrollment_id: enrollmentId,
                membership_benefit_id: dto.membership_benefit_id,
                patient_id: dto.patient_id,
                treatment_id: dto.treatment_id,
                invoice_id: dto.invoice_id,
                quantity_used: usageQuantity,
                discount_applied: this.decimalOrUndefined(dto.discount_applied),
                notes: dto.notes,
                used_on: usedOn,
            },
            include: {
                benefit: true,
                patient: true,
                treatment: true,
                invoice: true,
            },
        });
    }
    async getPatientSummary(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
        }
        const enrollments = await this.prisma.membershipEnrollment.findMany({
            where: {
                clinic_id: clinicId,
                OR: [
                    { primary_patient_id: patientId },
                    { members: { some: { patient_id: patientId } } },
                ],
            },
            include: membershipEnrollmentInclude,
            orderBy: [{ created_at: 'desc' }],
        });
        const now = new Date();
        const mapped = await Promise.all(enrollments.map(async (enrollment) => ({
            id: enrollment.id,
            enrollment_number: enrollment.enrollment_number,
            status: enrollment.status,
            start_date: enrollment.start_date,
            end_date: enrollment.end_date,
            amount_paid: enrollment.amount_paid,
            notes: enrollment.notes,
            is_primary_holder: enrollment.primary_patient_id === patientId,
            is_active: enrollment.status === 'active' && enrollment.start_date <= now && enrollment.end_date >= now,
            branch: enrollment.branch,
            membership_plan: {
                id: enrollment.membership_plan.id,
                name: enrollment.membership_plan.name,
                code: enrollment.membership_plan.code,
                description: enrollment.membership_plan.description,
                price: enrollment.membership_plan.price,
                covered_members_limit: enrollment.membership_plan.covered_members_limit,
            },
            members: enrollment.members.map((member) => ({
                id: member.id,
                patient_id: member.patient_id,
                relation_label: member.relation_label,
                is_primary: member.is_primary,
                patient: member.patient,
            })),
            benefits: await Promise.all(enrollment.membership_plan.benefits.map(async (benefit) => {
                const usedQuantity = await this.getUsedQuantity(enrollment.id, benefit, patientId);
                const remaining = await this.getRemainingQuantity(enrollment.id, benefit, patientId);
                return {
                    id: benefit.id,
                    title: benefit.title,
                    description: benefit.description,
                    benefit_type: benefit.benefit_type,
                    treatment_label: benefit.treatment_label,
                    coverage_scope: benefit.coverage_scope,
                    included_quantity: benefit.included_quantity,
                    discount_percentage: benefit.discount_percentage,
                    discount_amount: benefit.discount_amount,
                    credit_amount: benefit.credit_amount,
                    is_active: benefit.is_active,
                    used_quantity: usedQuantity,
                    remaining_quantity: remaining,
                };
            })),
            recent_usages: enrollment.usages.slice(0, 10),
        })));
        return {
            patient,
            active_enrollments: mapped.filter((enrollment) => enrollment.is_active),
            past_enrollments: mapped.filter((enrollment) => !enrollment.is_active),
        };
    }
    async findOnePlan(clinicId, id) {
        const plan = await this.prisma.membershipPlan.findUnique({
            where: { id },
            include: membershipPlanInclude,
        });
        if (!plan || plan.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Membership plan with ID "${id}" not found`);
        }
        return plan;
    }
    async findOneEnrollment(clinicId, id) {
        const enrollment = await this.prisma.membershipEnrollment.findUnique({
            where: { id },
            include: membershipEnrollmentInclude,
        });
        if (!enrollment || enrollment.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Membership enrollment with ID "${id}" not found`);
        }
        return enrollment;
    }
    async ensurePlanUniqueness(clinicId, name, code, excludeId) {
        const [nameMatch, codeMatch] = await Promise.all([
            this.prisma.membershipPlan.findFirst({ where: { clinic_id: clinicId, name } }),
            code ? this.prisma.membershipPlan.findFirst({ where: { clinic_id: clinicId, code } }) : Promise.resolve(null),
        ]);
        if (nameMatch && nameMatch.id !== excludeId) {
            throw new common_1.ConflictException(`Membership plan with name "${name}" already exists`);
        }
        if (code && codeMatch && codeMatch.id !== excludeId) {
            throw new common_1.ConflictException(`Membership plan with code "${code}" already exists`);
        }
    }
    decimalOrUndefined(value) {
        return value !== undefined ? new client_1.Prisma.Decimal(value) : undefined;
    }
    calculateEndDate(startDate, durationMonths, gracePeriodDays) {
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + durationMonths);
        endDate.setDate(endDate.getDate() + gracePeriodDays);
        return endDate;
    }
    generateEnrollmentNumber() {
        const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const suffix = Math.floor(1000 + Math.random() * 9000);
        return `MEM-${stamp}-${suffix}`;
    }
    async getUsedQuantity(enrollmentId, benefit, patientId) {
        const result = await this.prisma.membershipBenefitUsage.aggregate({
            where: {
                membership_enrollment_id: enrollmentId,
                membership_benefit_id: benefit.id,
                ...(benefit.coverage_scope === 'per_member' ? { patient_id: patientId } : {}),
            },
            _sum: { quantity_used: true },
        });
        return Number(result._sum.quantity_used ?? 0);
    }
    async getRemainingQuantity(enrollmentId, benefit, patientId) {
        if (benefit.included_quantity === null || benefit.included_quantity === undefined) {
            return null;
        }
        const usedQuantity = await this.getUsedQuantity(enrollmentId, benefit, patientId);
        return Math.max(benefit.included_quantity - usedQuantity, 0);
    }
};
exports.MembershipService = MembershipService;
exports.MembershipService = MembershipService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], MembershipService);
//# sourceMappingURL=membership.service.js.map