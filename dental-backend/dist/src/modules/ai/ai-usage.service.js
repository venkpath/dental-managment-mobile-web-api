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
var AiUsageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiUsageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const ai_pricing_js_1 = require("./ai-pricing.js");
const DEFAULT_CYCLE_DAYS = 30;
let AiUsageService = AiUsageService_1 = class AiUsageService {
    prisma;
    logger = new common_1.Logger(AiUsageService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureSettings(clinicId) {
        const existing = await this.prisma.clinicAiSettings.findUnique({
            where: { clinic_id: clinicId },
        });
        if (existing)
            return existing;
        const { start, end } = this.deriveInitialCycle();
        return this.prisma.clinicAiSettings.create({
            data: {
                clinic_id: clinicId,
                current_cycle_start: start,
                current_cycle_end: end,
            },
        });
    }
    deriveInitialCycle(now = new Date()) {
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + DEFAULT_CYCLE_DAYS);
        return { start, end };
    }
    async snapshot(clinicId) {
        const [clinic, settings, blockingCharge] = await Promise.all([
            this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: {
                    plan: { select: { name: true, ai_quota: true, ai_overage_cap: true } },
                },
            }),
            this.ensureSettings(clinicId),
            this.prisma.aiOverageCharge.findFirst({
                where: { clinic_id: clinicId, status: { in: ['pending', 'invoiced'] } },
                orderBy: { cycle_start: 'asc' },
                select: { id: true },
            }),
        ]);
        const baseQuota = clinic?.plan?.ai_quota ?? 0;
        const overageCap = clinic?.plan?.ai_overage_cap ?? 0;
        const overageHeadroom = settings.overage_enabled
            ? Math.max(0, overageCap - baseQuota)
            : 0;
        const effective = baseQuota + overageHeadroom + settings.approved_extra;
        return {
            base_quota: baseQuota,
            overage_cap: overageCap,
            overage_enabled: settings.overage_enabled,
            approved_extra: settings.approved_extra,
            used_in_cycle: settings.used_in_cycle,
            effective_quota: effective,
            cycle_start: settings.current_cycle_start,
            cycle_end: settings.current_cycle_end,
            is_blocked_unpaid: !!blockingCharge,
            pending_charge_id: blockingCharge?.id ?? null,
            plan_name: clinic?.plan?.name ?? null,
        };
    }
    async reserveSlot(clinicId) {
        const snap = await this.snapshot(clinicId);
        if (snap.is_blocked_unpaid) {
            throw new common_1.ForbiddenException('AI features are paused until your previous billing cycle overage charge is settled. Please complete payment to resume.');
        }
        if (snap.effective_quota <= 0) {
            throw new common_1.ForbiddenException('AI features require an active subscription plan with AI quota.');
        }
        const updated = await this.prisma.clinicAiSettings.updateMany({
            where: {
                clinic_id: clinicId,
                used_in_cycle: { lt: snap.effective_quota },
            },
            data: { used_in_cycle: { increment: 1 } },
        });
        if (updated.count === 0) {
            if (!snap.overage_enabled && snap.overage_cap > snap.base_quota) {
                throw new common_1.ForbiddenException(`Base AI quota of ${snap.base_quota} reached. Enable overage in settings to continue (billed at OpenAI cost).`);
            }
            if (snap.overage_enabled && snap.overage_cap > 0 && snap.used_in_cycle >= snap.overage_cap + snap.approved_extra) {
                throw new common_1.ForbiddenException(`Plan AI cap of ${snap.overage_cap} reached for this cycle. Request additional approval from super-admin.`);
            }
            throw new common_1.ForbiddenException(`AI quota exhausted for this cycle (${snap.used_in_cycle}/${snap.effective_quota}).`);
        }
        return { ...snap, used_in_cycle: snap.used_in_cycle + 1 };
    }
    async releaseReservation(clinicId) {
        await this.prisma.clinicAiSettings.updateMany({
            where: { clinic_id: clinicId, used_in_cycle: { gt: 0 } },
            data: { used_in_cycle: { decrement: 1 } },
        });
    }
    async recordUsage(params) {
        const total = params.promptTokens + params.completionTokens;
        const costInr = (0, ai_pricing_js_1.computeCostInr)(params.model, params.promptTokens, params.completionTokens);
        const settings = await this.prisma.clinicAiSettings.findUnique({
            where: { clinic_id: params.clinicId },
        });
        if (!settings) {
            this.logger.warn(`No ClinicAiSettings for ${params.clinicId} — skipping usage record`);
            return;
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: params.clinicId },
            select: { plan: { select: { ai_quota: true } } },
        });
        const baseQuota = clinic?.plan?.ai_quota ?? 0;
        const isOverage = settings.used_in_cycle > baseQuota;
        await this.prisma.aiUsageRecord.create({
            data: {
                clinic_id: params.clinicId,
                user_id: params.userId,
                type: params.type,
                model: params.model,
                prompt_tokens: params.promptTokens,
                completion_tokens: params.completionTokens,
                total_tokens: total,
                cost_inr: costInr,
                is_overage: isOverage,
                cycle_start: settings.current_cycle_start,
                cycle_end: settings.current_cycle_end,
            },
        });
    }
    async setOverageEnabled(clinicId, enabled) {
        await this.ensureSettings(clinicId);
        return this.prisma.clinicAiSettings.update({
            where: { clinic_id: clinicId },
            data: { overage_enabled: enabled },
        });
    }
    async createApprovalRequest(params) {
        if (params.requestedAmount <= 0) {
            throw new common_1.BadRequestException('requested_amount must be positive');
        }
        const settings = await this.ensureSettings(params.clinicId);
        const existingPending = await this.prisma.aiQuotaApprovalRequest.findFirst({
            where: {
                clinic_id: params.clinicId,
                cycle_start: settings.current_cycle_start,
                status: 'pending',
            },
        });
        if (existingPending) {
            throw new common_1.BadRequestException('A pending approval request already exists for the current cycle.');
        }
        return this.prisma.aiQuotaApprovalRequest.create({
            data: {
                clinic_id: params.clinicId,
                requested_by: params.userId,
                requested_amount: params.requestedAmount,
                reason: params.reason,
                cycle_start: settings.current_cycle_start,
            },
        });
    }
    async listMyApprovalRequests(clinicId) {
        return this.prisma.aiQuotaApprovalRequest.findMany({
            where: { clinic_id: clinicId },
            orderBy: { created_at: 'desc' },
            take: 25,
        });
    }
    async listApprovalRequests(filters = {}) {
        return this.prisma.aiQuotaApprovalRequest.findMany({
            where: {
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.clinicId ? { clinic_id: filters.clinicId } : {}),
            },
            include: { clinic: { select: { id: true, name: true, email: true } } },
            orderBy: { created_at: 'desc' },
            take: 100,
        });
    }
    async decideApprovalRequest(params) {
        const request = await this.prisma.aiQuotaApprovalRequest.findUnique({
            where: { id: params.requestId },
        });
        if (!request)
            throw new common_1.NotFoundException('Approval request not found');
        if (request.status !== 'pending') {
            throw new common_1.BadRequestException('Request has already been decided');
        }
        if (params.status === 'approved') {
            const amount = params.approvedAmount ?? request.requested_amount;
            if (amount <= 0) {
                throw new common_1.BadRequestException('approved_amount must be positive');
            }
            await this.prisma.$transaction([
                this.prisma.aiQuotaApprovalRequest.update({
                    where: { id: params.requestId },
                    data: {
                        status: 'approved',
                        approved_amount: amount,
                        approved_by: params.superAdminId,
                        decision_note: params.note,
                        decided_at: new Date(),
                    },
                }),
                this.prisma.clinicAiSettings.update({
                    where: { clinic_id: request.clinic_id },
                    data: {
                        approved_extra: { increment: amount },
                        approved_extra_reason: params.note ?? request.reason,
                    },
                }),
            ]);
        }
        else {
            await this.prisma.aiQuotaApprovalRequest.update({
                where: { id: params.requestId },
                data: {
                    status: 'rejected',
                    approved_by: params.superAdminId,
                    decision_note: params.note,
                    decided_at: new Date(),
                },
            });
        }
        return this.prisma.aiQuotaApprovalRequest.findUnique({ where: { id: params.requestId } });
    }
    async listOverageCharges(filters = {}) {
        return this.prisma.aiOverageCharge.findMany({
            where: {
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.clinicId ? { clinic_id: filters.clinicId } : {}),
            },
            include: { clinic: { select: { id: true, name: true, email: true } } },
            orderBy: { cycle_start: 'desc' },
            take: 100,
        });
    }
    async markChargePaid(params) {
        const charge = await this.prisma.aiOverageCharge.findUnique({ where: { id: params.chargeId } });
        if (!charge)
            throw new common_1.NotFoundException('Overage charge not found');
        if (charge.status === 'paid' || charge.status === 'waived') {
            throw new common_1.BadRequestException(`Charge already ${charge.status}`);
        }
        return this.prisma.aiOverageCharge.update({
            where: { id: params.chargeId },
            data: {
                status: 'paid',
                paid_at: new Date(),
                paid_by_super_admin_id: params.superAdminId,
                payment_reference: params.paymentReference,
                notes: params.note,
            },
        });
    }
    async waiveCharge(params) {
        const charge = await this.prisma.aiOverageCharge.findUnique({ where: { id: params.chargeId } });
        if (!charge)
            throw new common_1.NotFoundException('Overage charge not found');
        if (charge.status === 'paid' || charge.status === 'waived') {
            throw new common_1.BadRequestException(`Charge already ${charge.status}`);
        }
        return this.prisma.aiOverageCharge.update({
            where: { id: params.chargeId },
            data: {
                status: 'waived',
                paid_at: new Date(),
                paid_by_super_admin_id: params.superAdminId,
                notes: params.note,
            },
        });
    }
    async settleOldestPendingFromPayment(clinicId, paymentReference) {
        const charge = await this.prisma.aiOverageCharge.findFirst({
            where: { clinic_id: clinicId, status: { in: ['pending', 'invoiced'] } },
            orderBy: { cycle_start: 'asc' },
        });
        if (!charge)
            return;
        await this.prisma.aiOverageCharge.update({
            where: { id: charge.id },
            data: {
                status: 'paid',
                paid_at: new Date(),
                payment_reference: paymentReference,
                notes: 'Auto-settled via Razorpay subscription charge',
            },
        });
        this.logger.log(`Settled overage charge ${charge.id} for clinic ${clinicId} via ${paymentReference}`);
    }
    async closeEndedCycles(now = new Date()) {
        const dueClinics = await this.prisma.clinicAiSettings.findMany({
            where: { current_cycle_end: { lte: now } },
            select: { clinic_id: true },
        });
        let closed = 0;
        for (const { clinic_id } of dueClinics) {
            try {
                await this.closeCycleForClinic(clinic_id);
                closed++;
            }
            catch (err) {
                this.logger.error(`Failed to close cycle for clinic ${clinic_id}: ${err.message}`);
            }
        }
        return closed;
    }
    async closeCycleForClinic(clinicId) {
        const settings = await this.prisma.clinicAiSettings.findUnique({
            where: { clinic_id: clinicId },
        });
        if (!settings)
            return;
        const overageAgg = await this.prisma.aiUsageRecord.aggregate({
            where: {
                clinic_id: clinicId,
                cycle_start: settings.current_cycle_start,
                is_overage: true,
            },
            _count: true,
            _sum: { cost_inr: true },
        });
        const overageCount = overageAgg._count ?? 0;
        const totalCost = Number(overageAgg._sum?.cost_inr ?? 0);
        if (overageCount > 0) {
            const clinic = await this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { plan: { select: { ai_quota: true } } },
            });
            const baseQuota = clinic?.plan?.ai_quota ?? 0;
            await this.prisma.aiOverageCharge.upsert({
                where: {
                    clinic_id_cycle_start: {
                        clinic_id: clinicId,
                        cycle_start: settings.current_cycle_start,
                    },
                },
                create: {
                    clinic_id: clinicId,
                    cycle_start: settings.current_cycle_start,
                    cycle_end: settings.current_cycle_end,
                    base_quota: baseQuota,
                    overage_requests_count: overageCount,
                    approved_requests_count: settings.approved_extra,
                    total_cost_inr: totalCost,
                    status: 'pending',
                },
                update: {
                    overage_requests_count: overageCount,
                    approved_requests_count: settings.approved_extra,
                    total_cost_inr: totalCost,
                },
            });
        }
        const nextStart = new Date(settings.current_cycle_end);
        const nextEnd = new Date(nextStart);
        nextEnd.setUTCDate(nextEnd.getUTCDate() + DEFAULT_CYCLE_DAYS);
        await this.prisma.clinicAiSettings.update({
            where: { clinic_id: clinicId },
            data: {
                current_cycle_start: nextStart,
                current_cycle_end: nextEnd,
                used_in_cycle: 0,
                approved_extra: 0,
                approved_extra_reason: null,
            },
        });
    }
    async syncCycleWithSubscription(clinicId, periodStart, periodEnd) {
        await this.ensureSettings(clinicId);
        const current = await this.prisma.clinicAiSettings.findUnique({
            where: { clinic_id: clinicId },
        });
        if (!current)
            return;
        if (current.current_cycle_start.getTime() === periodStart.getTime() &&
            current.current_cycle_end.getTime() === periodEnd.getTime()) {
            return;
        }
        await this.prisma.clinicAiSettings.update({
            where: { clinic_id: clinicId },
            data: {
                current_cycle_start: periodStart,
                current_cycle_end: periodEnd,
            },
        });
    }
};
exports.AiUsageService = AiUsageService;
exports.AiUsageService = AiUsageService = AiUsageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], AiUsageService);
//# sourceMappingURL=ai-usage.service.js.map