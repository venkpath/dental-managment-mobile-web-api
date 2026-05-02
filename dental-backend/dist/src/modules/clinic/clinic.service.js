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
const TRIAL_DAYS = 14;
let ClinicService = class ClinicService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
                plan: {
                    select: {
                        name: true,
                        price_monthly: true,
                        max_branches: true,
                        max_staff: true,
                        ai_quota: true,
                        max_patients_per_month: true,
                        max_appointments_per_month: true,
                        max_invoices_per_month: true,
                        max_treatments_per_month: true,
                        plan_features: {
                            where: { is_enabled: true },
                            select: { feature: { select: { key: true } } },
                        },
                    },
                },
            },
        });
        if (!clinic)
            throw new common_1.NotFoundException(`Clinic with ID "${clinicId}" not found`);
        const plan = clinic.plan;
        return {
            plan: plan
                ? {
                    name: plan.name,
                    price_monthly: Number(plan.price_monthly),
                    max_branches: plan.max_branches,
                    max_staff: plan.max_staff,
                    ai_quota: plan.ai_quota,
                    max_patients_per_month: plan.max_patients_per_month,
                    max_appointments_per_month: plan.max_appointments_per_month,
                    max_invoices_per_month: plan.max_invoices_per_month,
                    max_treatments_per_month: plan.max_treatments_per_month,
                }
                : null,
            features: plan?.plan_features.map((pf) => pf.feature.key) ?? [],
        };
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.clinic.update({
            where: { id },
            data: dto,
        });
    }
    async updateSubscription(id, dto) {
        await this.findOne(id);
        const { trial_ends_at, ...rest } = dto;
        return this.prisma.clinic.update({
            where: { id },
            data: {
                ...rest,
                ...(trial_ends_at !== undefined ? { trial_ends_at: new Date(trial_ends_at) } : {}),
            },
            include: { plan: true },
        });
    }
};
exports.ClinicService = ClinicService;
exports.ClinicService = ClinicService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ClinicService);
//# sourceMappingURL=clinic.service.js.map