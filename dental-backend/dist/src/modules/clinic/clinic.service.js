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
exports.ClinicService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const clinic_feature_service_js_1 = require("../feature/clinic-feature.service.js");
const name_util_js_1 = require("../../common/utils/name.util.js");
const TRIAL_DAYS = 14;
let ClinicService = class ClinicService {
    prisma;
    clinicFeatureService;
    constructor(prisma, clinicFeatureService) {
        this.prisma = prisma;
        this.clinicFeatureService = clinicFeatureService;
    }
    async create(dto) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
        return this.prisma.clinic.create({
            data: {
                ...dto,
                trial_ends_at: trialEndsAt,
            },
        });
    }
    async findAll() {
        return this.prisma.clinic.findMany({
            orderBy: { created_at: 'desc' },
            include: { plan: true },
        });
    }
    async findOne(id) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id },
            include: { plan: true },
        });
        if (!clinic) {
            throw new common_1.NotFoundException(`Clinic with ID "${id}" not found`);
        }
        return clinic;
    }
    async getFeatures(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                billing_cycle: true,
                plan: { select: { name: true, price_monthly: true } },
            },
        });
        if (!clinic)
            throw new common_1.NotFoundException(`Clinic with ID "${clinicId}" not found`);
        const billingCycle = clinic.billing_cycle || 'monthly';
        const [features, limits, effectivePrice] = await Promise.all([
            this.clinicFeatureService.getEffectiveFeatureKeys(clinicId),
            this.clinicFeatureService.getEffectiveLimits(clinicId),
            this.clinicFeatureService.getEffectivePrice(clinicId, billingCycle),
        ]);
        return {
            plan: clinic.plan
                ? {
                    name: clinic.plan.name,
                    price_monthly: Number(clinic.plan.price_monthly),
                    effective_price: effectivePrice.amount,
                    price_source: effectivePrice.source,
                    custom_price_expires_at: effectivePrice.custom_expires_at,
                    ...limits,
                }
                : null,
            features,
        };
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.name)
            dto.name = (0, name_util_js_1.decodeHtmlEntities)(dto.name);
        const payload = { ...dto };
        if ('listed_in_directory' in dto) {
            if (dto.listed_in_directory === true) {
                payload.listed_in_directory = false;
                payload.directory_approval_status = 'pending';
                payload.directory_requested_at = new Date();
                payload.directory_rejection_reason = null;
            }
            else if (dto.listed_in_directory === false) {
                payload.listed_in_directory = false;
                payload.directory_approval_status = 'none';
                payload.directory_requested_at = null;
                payload.directory_approved_at = null;
                payload.directory_rejection_reason = null;
            }
        }
        return this.prisma.clinic.update({ where: { id }, data: payload });
    }
    async updateSubscription(id, dto) {
        await this.findOne(id);
        const { trial_ends_at, next_billing_at, billing_cycle, ...rest } = dto;
        let resolvedNextBillingAt = next_billing_at;
        if (billing_cycle !== undefined && next_billing_at === undefined) {
            const anchor = new Date();
            if (billing_cycle === 'yearly') {
                anchor.setFullYear(anchor.getFullYear() + 1);
            }
            else {
                anchor.setMonth(anchor.getMonth() + 1);
            }
            resolvedNextBillingAt = anchor.toISOString();
        }
        return this.prisma.clinic.update({
            where: { id },
            data: {
                ...rest,
                ...(billing_cycle !== undefined ? { billing_cycle } : {}),
                ...(trial_ends_at !== undefined ? { trial_ends_at: new Date(trial_ends_at) } : {}),
                ...(resolvedNextBillingAt !== undefined
                    ? { next_billing_at: resolvedNextBillingAt === null ? null : new Date(resolvedNextBillingAt) }
                    : {}),
            },
            include: { plan: true },
        });
    }
    async getOnboardingStatus(clinicId) {
        const [clinic, branch, staffCount, patientCount, appointmentCount] = await Promise.all([
            this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { logo_url: true, address: true, city: true, state: true, phone: true },
            }),
            this.prisma.branch.findFirst({
                where: { clinic_id: clinicId },
                select: { working_start_time: true, working_end_time: true },
            }),
            this.prisma.user.count({
                where: { clinic_id: clinicId, role: { not: 'SuperAdmin' }, status: 'active' },
            }),
            this.prisma.patient.count({ where: { clinic_id: clinicId } }),
            this.prisma.appointment.count({ where: { clinic_id: clinicId } }),
        ]);
        const items = [
            {
                id: 'clinic_logo',
                title: 'Upload clinic logo',
                description: 'Shows on invoices, prescriptions & patient communications',
                completed: !!clinic?.logo_url,
                href: '/settings',
                category: 'setup',
                weight: 5,
            },
            {
                id: 'clinic_address',
                title: 'Complete clinic address',
                description: 'Required for invoices and public directory listing',
                completed: !!(clinic?.address && clinic?.city && clinic?.state),
                href: '/settings',
                category: 'setup',
                weight: 10,
            },
            {
                id: 'clinic_phone',
                title: 'Add clinic contact number',
                description: 'Printed on prescriptions and invoices for patients',
                completed: !!clinic?.phone,
                href: '/settings',
                category: 'setup',
                weight: 5,
            },
            {
                id: 'branch_hours',
                title: 'Set branch working hours',
                description: 'Define when patients can book and staff can be scheduled',
                completed: !!(branch?.working_start_time && branch?.working_end_time),
                href: '/branches',
                category: 'setup',
                weight: 15,
            },
            {
                id: 'add_staff',
                title: 'Invite your first staff member',
                description: 'Add dentists, receptionists or assistants to your clinic',
                completed: staffCount > 0,
                href: '/staff',
                category: 'team',
                weight: 15,
            },
            {
                id: 'add_patient',
                title: 'Add your first patient',
                description: 'Register a patient to start managing their dental care',
                completed: patientCount > 0,
                href: '/patients/new',
                category: 'patients',
                weight: 20,
            },
            {
                id: 'book_appointment',
                title: 'Book your first appointment',
                description: 'Schedule a patient on the calendar',
                completed: appointmentCount > 0,
                href: '/appointments',
                category: 'patients',
                weight: 25,
            },
        ];
        const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
        const completedWeight = items
            .filter((i) => i.completed)
            .reduce((sum, i) => sum + i.weight, 0);
        return {
            percentage: Math.round((completedWeight / totalWeight) * 100),
            completed_count: items.filter((i) => i.completed).length,
            total_count: items.length,
            items,
        };
    }
};
exports.ClinicService = ClinicService;
exports.ClinicService = ClinicService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        clinic_feature_service_js_1.ClinicFeatureService])
], ClinicService);
//# sourceMappingURL=clinic.service.js.map