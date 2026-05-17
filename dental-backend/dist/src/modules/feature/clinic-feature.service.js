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
var ClinicFeatureService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicFeatureService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let ClinicFeatureService = ClinicFeatureService_1 = class ClinicFeatureService {
    prisma;
    logger = new common_1.Logger(ClinicFeatureService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getEffectiveFeatures(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { id: true, plan_id: true },
        });
        if (!clinic)
            throw new common_1.NotFoundException(`Clinic ${clinicId} not found`);
        const now = new Date();
        const [features, planFeatures, overrides] = await Promise.all([
            this.prisma.feature.findMany({ orderBy: { key: 'asc' } }),
            clinic.plan_id
                ? this.prisma.planFeature.findMany({ where: { plan_id: clinic.plan_id } })
                : Promise.resolve([]),
            this.prisma.clinicFeatureOverride.findMany({ where: { clinic_id: clinicId } }),
        ]);
        const planMap = new Map(planFeatures.map((pf) => [pf.feature_id, pf.is_enabled]));
        const overrideMap = new Map(overrides.map((o) => [o.feature_id, o]));
        return features.map((f) => {
            const planEnabled = planMap.has(f.id) ? planMap.get(f.id) : null;
            const overrideRow = overrideMap.get(f.id) ?? null;
            const overrideActive = overrideRow && (!overrideRow.expires_at || overrideRow.expires_at > now);
            const overrideEnabled = overrideActive ? overrideRow.is_enabled : null;
            let effective;
            let source;
            if (overrideEnabled !== null) {
                effective = overrideEnabled;
                source = 'override';
            }
            else if (planEnabled !== null) {
                effective = planEnabled;
                source = 'plan';
            }
            else {
                effective = false;
                source = 'none';
            }
            return {
                feature_id: f.id,
                key: f.key,
                description: f.description,
                is_enabled: effective,
                source,
                plan_enabled: planEnabled,
                override_enabled: overrideEnabled,
                redundant_with_plan: source === 'override' && planEnabled === overrideEnabled,
                reason: overrideActive ? overrideRow.reason : null,
                granted_by_super_admin_id: overrideActive ? overrideRow.granted_by_super_admin_id : null,
                expires_at: overrideActive ? overrideRow.expires_at : null,
            };
        });
    }
    async getEffectiveFeatureKeys(clinicId) {
        const rows = await this.getEffectiveFeatures(clinicId);
        return rows.filter((r) => r.is_enabled).map((r) => r.key);
    }
    async getEffectiveLimits(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                custom_max_branches: true,
                custom_max_staff: true,
                ai_quota_override: true,
                custom_patient_limit: true,
                custom_appointment_limit: true,
                custom_invoice_limit: true,
                custom_treatment_limit: true,
                custom_prescription_limit: true,
                custom_consultation_limit: true,
                plan: {
                    select: {
                        max_branches: true,
                        max_staff: true,
                        ai_quota: true,
                        max_patients_per_month: true,
                        max_appointments_per_month: true,
                        max_invoices_per_month: true,
                        max_treatments_per_month: true,
                        max_prescriptions_per_month: true,
                        max_consultations_per_month: true,
                    },
                },
            },
        });
        if (!clinic)
            throw new common_1.NotFoundException(`Clinic ${clinicId} not found`);
        const plan = clinic.plan;
        return {
            max_branches: clinic.custom_max_branches ?? plan?.max_branches ?? null,
            max_staff: clinic.custom_max_staff ?? plan?.max_staff ?? null,
            ai_quota: clinic.ai_quota_override ?? plan?.ai_quota ?? null,
            max_patients_per_month: clinic.custom_patient_limit ?? plan?.max_patients_per_month ?? null,
            max_appointments_per_month: clinic.custom_appointment_limit ?? plan?.max_appointments_per_month ?? null,
            max_invoices_per_month: clinic.custom_invoice_limit ?? plan?.max_invoices_per_month ?? null,
            max_treatments_per_month: clinic.custom_treatment_limit ?? plan?.max_treatments_per_month ?? null,
            max_prescriptions_per_month: clinic.custom_prescription_limit ?? plan?.max_prescriptions_per_month ?? null,
            max_consultations_per_month: clinic.custom_consultation_limit ?? plan?.max_consultations_per_month ?? null,
        };
    }
    async isFeatureEnabled(clinicId, featureKey) {
        const feature = await this.prisma.feature.findUnique({
            where: { key: featureKey },
            select: { id: true },
        });
        if (!feature)
            return false;
        const override = await this.prisma.clinicFeatureOverride.findUnique({
            where: { clinic_id_feature_id: { clinic_id: clinicId, feature_id: feature.id } },
            select: { is_enabled: true, expires_at: true },
        });
        if (override && (!override.expires_at || override.expires_at > new Date())) {
            return override.is_enabled;
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { plan_id: true },
        });
        if (!clinic?.plan_id)
            return false;
        const planFeature = await this.prisma.planFeature.findUnique({
            where: { plan_id_feature_id: { plan_id: clinic.plan_id, feature_id: feature.id } },
            select: { is_enabled: true },
        });
        return planFeature?.is_enabled ?? false;
    }
    async upsertOverrides(clinicId, overrides, grantedBySuperAdminId) {
        if (overrides.length === 0)
            return;
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { id: true },
        });
        if (!clinic)
            throw new common_1.NotFoundException(`Clinic ${clinicId} not found`);
        const featureIds = Array.from(new Set(overrides.map((o) => o.feature_id)));
        const existing = await this.prisma.feature.findMany({
            where: { id: { in: featureIds } },
            select: { id: true },
        });
        const existingIds = new Set(existing.map((f) => f.id));
        const missing = featureIds.filter((id) => !existingIds.has(id));
        if (missing.length > 0) {
            throw new common_1.NotFoundException(`Features not found: ${missing.join(', ')}`);
        }
        await this.prisma.$transaction(overrides.map((o) => {
            const wantsRemove = o.is_enabled === null || o.is_enabled === undefined;
            if (wantsRemove) {
                return this.prisma.clinicFeatureOverride.deleteMany({
                    where: { clinic_id: clinicId, feature_id: o.feature_id },
                });
            }
            return this.prisma.clinicFeatureOverride.upsert({
                where: {
                    clinic_id_feature_id: { clinic_id: clinicId, feature_id: o.feature_id },
                },
                update: {
                    is_enabled: o.is_enabled,
                    reason: o.reason ?? null,
                    expires_at: o.expires_at ?? null,
                    granted_by_super_admin_id: grantedBySuperAdminId ?? null,
                },
                create: {
                    clinic_id: clinicId,
                    feature_id: o.feature_id,
                    is_enabled: o.is_enabled,
                    reason: o.reason ?? null,
                    expires_at: o.expires_at ?? null,
                    granted_by_super_admin_id: grantedBySuperAdminId ?? null,
                },
            });
        }));
    }
    async getEffectivePrice(clinicId, billingCycle) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                custom_price_monthly: true,
                custom_price_yearly: true,
                custom_price_expires_at: true,
                custom_price_reason: true,
                plan: { select: { price_monthly: true, price_yearly: true } },
            },
        });
        if (!clinic)
            throw new common_1.NotFoundException(`Clinic ${clinicId} not found`);
        const customActive = !clinic.custom_price_expires_at || clinic.custom_price_expires_at > new Date();
        const customField = billingCycle === 'yearly' ? clinic.custom_price_yearly : clinic.custom_price_monthly;
        const planAmount = clinic.plan
            ? billingCycle === 'yearly'
                ? Number(clinic.plan.price_yearly ?? clinic.plan.price_monthly) * 12
                : Number(clinic.plan.price_monthly)
            : null;
        const customMonthly = clinic.custom_price_monthly != null ? Number(clinic.custom_price_monthly) : null;
        const customYearly = clinic.custom_price_yearly != null ? Number(clinic.custom_price_yearly) : null;
        if (customActive && customField != null) {
            return {
                amount: Number(customField),
                source: 'custom',
                custom_price_monthly: customMonthly,
                custom_price_yearly: customYearly,
                custom_expires_at: clinic.custom_price_expires_at,
                custom_reason: clinic.custom_price_reason,
                plan_amount: planAmount,
            };
        }
        return {
            amount: planAmount,
            source: planAmount != null ? 'plan' : 'none',
            custom_price_monthly: customMonthly,
            custom_price_yearly: customYearly,
            custom_expires_at: clinic.custom_price_expires_at,
            custom_reason: clinic.custom_price_reason,
            plan_amount: planAmount,
        };
    }
    async setCustomPrice(clinicId, input, grantedBySuperAdminId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { id: true },
        });
        if (!clinic)
            throw new common_1.NotFoundException(`Clinic ${clinicId} not found`);
        const clearing = input.custom_price_monthly === null && input.custom_price_yearly === null;
        await this.prisma.clinic.update({
            where: { id: clinicId },
            data: {
                custom_price_monthly: input.custom_price_monthly,
                custom_price_yearly: input.custom_price_yearly,
                custom_price_expires_at: clearing ? null : input.expires_at,
                custom_price_reason: clearing ? null : input.reason,
                custom_price_granted_by_super_admin_id: clearing ? null : grantedBySuperAdminId,
            },
        });
    }
    async removeOverride(clinicId, featureId) {
        const result = await this.prisma.clinicFeatureOverride.deleteMany({
            where: { clinic_id: clinicId, feature_id: featureId },
        });
        if (result.count === 0) {
            throw new common_1.NotFoundException(`No feature override found for clinic ${clinicId} / feature ${featureId}`);
        }
    }
    async purgeExpiredOverrides(now = new Date()) {
        const result = await this.prisma.clinicFeatureOverride.deleteMany({
            where: { expires_at: { lt: now } },
        });
        return result.count;
    }
    async cleanupExpiredOverrides() {
        const deleted = await this.purgeExpiredOverrides();
        if (deleted > 0) {
            this.logger.log(`Purged ${deleted} expired feature override(s)`);
        }
    }
};
exports.ClinicFeatureService = ClinicFeatureService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClinicFeatureService.prototype, "cleanupExpiredOverrides", null);
exports.ClinicFeatureService = ClinicFeatureService = ClinicFeatureService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ClinicFeatureService);
//# sourceMappingURL=clinic-feature.service.js.map