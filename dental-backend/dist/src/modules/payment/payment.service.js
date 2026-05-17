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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const ai_usage_service_js_1 = require("../ai/ai-usage.service.js");
const platform_billing_service_js_1 = require("../platform-billing/platform-billing.service.js");
const clinic_feature_service_js_1 = require("../feature/clinic-feature.service.js");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = require("crypto");
let PaymentService = PaymentService_1 = class PaymentService {
    configService;
    prisma;
    aiUsage;
    platformBilling;
    clinicFeatureService;
    logger = new common_1.Logger(PaymentService_1.name);
    razorpay;
    constructor(configService, prisma, aiUsage, platformBilling, clinicFeatureService) {
        this.configService = configService;
        this.prisma = prisma;
        this.aiUsage = aiUsage;
        this.platformBilling = platformBilling;
        this.clinicFeatureService = clinicFeatureService;
    }
    onModuleInit() {
        const keyId = this.configService.get('razorpay.keyId');
        const keySecret = this.configService.get('razorpay.keySecret');
        if (keyId && keySecret) {
            this.razorpay = new razorpay_1.default({ key_id: keyId, key_secret: keySecret });
        }
        else {
            this.logger.warn('Razorpay credentials not configured — payment features disabled');
        }
    }
    async getSubscriptionStatus(clinicId) {
        if (!clinicId)
            throw new common_1.BadRequestException('Clinic ID is required');
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            include: { plan: true },
        });
        if (!clinic)
            throw new common_1.BadRequestException('Clinic not found');
        const now = new Date();
        const trialEndsAt = clinic.trial_ends_at ? new Date(clinic.trial_ends_at) : null;
        const isTrialActive = clinic.subscription_status === 'trial' && trialEndsAt && trialEndsAt > now;
        const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        let billingDetails = {
            current_period_start: null,
            current_period_end: null,
            next_charge_at: null,
            paid_count: 0,
            total_count: 0,
            remaining_count: 0,
            started_at: null,
            ended_at: null,
        };
        if (clinic.subscription_id && this.razorpay) {
            try {
                const sub = await this.razorpay.subscriptions.fetch(clinic.subscription_id);
                billingDetails = {
                    current_period_start: sub.current_start ? new Date(Number(sub.current_start) * 1000).toISOString() : null,
                    current_period_end: sub.current_end ? new Date(Number(sub.current_end) * 1000).toISOString() : null,
                    next_charge_at: sub.charge_at ? new Date(Number(sub.charge_at) * 1000).toISOString() : null,
                    paid_count: Number(sub.paid_count) || 0,
                    total_count: Number(sub.total_count) || 0,
                    remaining_count: Number(sub.remaining_count) || 0,
                    started_at: sub.start_at ? new Date(Number(sub.start_at) * 1000).toISOString() : null,
                    ended_at: sub.ended_at ? new Date(Number(sub.ended_at) * 1000).toISOString() : null,
                };
                if (sub.current_start && sub.current_end) {
                    await this.aiUsage
                        .syncCycleWithSubscription(clinicId, new Date(Number(sub.current_start) * 1000), new Date(Number(sub.current_end) * 1000))
                        .catch((err) => this.logger.warn(`AI cycle sync failed for ${clinicId}: ${err.message}`));
                }
            }
            catch (e) {
                this.logger.warn(`Failed to fetch Razorpay subscription ${clinic.subscription_id}: ${e.message}`);
            }
        }
        const billingCycle = clinic.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
        const effectivePrice = clinic.plan
            ? await this.clinicFeatureService
                .getEffectivePrice(clinicId, billingCycle)
                .catch(() => null)
            : null;
        return {
            subscription_status: clinic.subscription_status,
            plan: clinic.plan ? { id: clinic.plan.id, name: clinic.plan.name, price_monthly: clinic.plan.price_monthly } : null,
            billing_cycle: billingCycle,
            next_billing_at: clinic.next_billing_at,
            effective_price: effectivePrice?.amount ?? null,
            price_source: effectivePrice?.source ?? null,
            custom_price_expires_at: effectivePrice?.custom_expires_at ?? null,
            trial_ends_at: clinic.trial_ends_at,
            is_trial_active: isTrialActive,
            trial_days_left: trialDaysLeft,
            subscription_id: clinic.subscription_id,
            razorpay_key_id: this.configService.get('razorpay.keyId') || '',
            ...billingDetails,
        };
    }
    async getPlans() {
        return this.prisma.plan.findMany({
            orderBy: { price_monthly: 'asc' },
            include: { plan_features: { include: { feature: true } } },
        });
    }
    async createSubscription(dto) {
        if (!this.razorpay)
            throw new common_1.BadRequestException('Payment system not configured');
        if (!dto.planKey && !dto.planId) {
            throw new common_1.BadRequestException('planId or planKey is required');
        }
        const plan = dto.planId
            ? await this.prisma.plan.findUnique({ where: { id: dto.planId } })
            : await this.prisma.plan.findFirst({
                where: { name: { equals: dto.planKey, mode: 'insensitive' } },
            });
        if (!plan)
            throw new common_1.BadRequestException(`Plan "${dto.planId ?? dto.planKey}" not found`);
        if (!plan.razorpay_plan_id) {
            throw new common_1.BadRequestException('Razorpay plan not configured for this plan. Contact support.');
        }
        const clinic = await this.prisma.clinic.findUnique({ where: { id: dto.clinicId } });
        if (!clinic)
            throw new common_1.BadRequestException('Clinic not found');
        if (clinic.plan_id === plan.id &&
            clinic.subscription_status === 'active' &&
            clinic.subscription_id) {
            throw new common_1.BadRequestException('Clinic is already subscribed to this plan');
        }
        let oldSubStatus = null;
        let oldSubCurrentEnd = null;
        if (clinic.subscription_id) {
            try {
                const oldSub = await this.razorpay.subscriptions.fetch(clinic.subscription_id);
                oldSubStatus = oldSub.status || null;
                oldSubCurrentEnd = oldSub.current_end ? Number(oldSub.current_end) : null;
            }
            catch (e) {
                this.logger.warn(`Old subscription ${clinic.subscription_id} not retrievable from Razorpay: ${unwrapRazorpayError(e)}`);
            }
        }
        if (clinic.subscription_id &&
            oldSubStatus &&
            ['authenticated', 'active', 'paused', 'halted'].includes(oldSubStatus)) {
            try {
                await this.razorpay.subscriptions.cancel(clinic.subscription_id, true);
                this.logger.log(`Scheduled cycle-end cancellation of subscription ${clinic.subscription_id} for clinic ${dto.clinicId} (plan change to ${plan.name})`);
            }
            catch (e) {
                const msg = unwrapRazorpayError(e);
                if (!/already|completed|cancelled|expired/i.test(msg)) {
                    this.logger.error(`Failed to cancel old subscription ${clinic.subscription_id}: ${msg}`);
                    throw new common_1.BadRequestException(`Could not cancel existing subscription: ${msg}`);
                }
            }
        }
        let startAt;
        const nowSec = Math.floor(Date.now() / 1000);
        if (oldSubCurrentEnd &&
            oldSubCurrentEnd > nowSec + 15 * 60 &&
            ['authenticated', 'active', 'paused'].includes(oldSubStatus ?? '')) {
            startAt = oldSubCurrentEnd;
        }
        let subscription;
        try {
            subscription = await this.razorpay.subscriptions.create({
                plan_id: plan.razorpay_plan_id,
                total_count: 12,
                quantity: 1,
                ...(startAt ? { start_at: startAt } : {}),
                notes: {
                    clinic_id: dto.clinicId,
                    plan_id: plan.id,
                    plan_name: plan.name,
                    previous_subscription_id: clinic.subscription_id || '',
                },
            });
        }
        catch (e) {
            const msg = unwrapRazorpayError(e);
            this.logger.error(`Razorpay subscriptions.create failed for clinic ${dto.clinicId} (plan=${plan.name}, razorpay_plan_id=${plan.razorpay_plan_id}, start_at=${startAt ?? 'none'}): ${msg}`);
            throw new common_1.BadRequestException(`Could not create subscription: ${msg}`);
        }
        const newStatus = clinic.subscription_status === 'active' ? 'active' : 'created';
        const isActivePlanChange = clinic.subscription_status === 'active' && !!clinic.subscription_id;
        const changeEffective = isActivePlanChange
            ? (dto.changeEffective ?? 'cycle_end')
            : 'now';
        let isPaidUpgrade = false;
        if (isActivePlanChange && changeEffective === 'now' && startAt) {
            isPaidUpgrade = await this.computeProrationDelta(clinic.plan_id, plan.id, clinic.billing_cycle).then((d) => d > 0);
        }
        await this.prisma.clinic.update({
            where: { id: dto.clinicId },
            data: {
                subscription_id: subscription.id,
                subscription_status: newStatus,
                ...(changeEffective === 'now' && !isPaidUpgrade ? { plan_id: plan.id } : {}),
            },
        });
        if (isActivePlanChange && changeEffective === 'now' && startAt) {
            await this.issueProrationInvoice(clinic.id, clinic.plan_id, plan.id, startAt).catch((err) => this.logger.warn(`Proration invoice failed for clinic ${clinic.id}: ${err.message}`));
        }
        return {
            subscriptionId: subscription.id,
            shortUrl: subscription.short_url || '',
        };
    }
    async computeProrationDelta(oldPlanId, newPlanId, billingCycle) {
        if (!oldPlanId || oldPlanId === newPlanId)
            return 0;
        const [oldPlan, newPlan] = await Promise.all([
            this.prisma.plan.findUnique({ where: { id: oldPlanId } }),
            this.prisma.plan.findUnique({ where: { id: newPlanId } }),
        ]);
        if (!oldPlan || !newPlan)
            return 0;
        const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
        const oldPrice = cycle === 'yearly'
            ? Number(oldPlan.price_yearly ?? oldPlan.price_monthly) * 12
            : Number(oldPlan.price_monthly);
        const newPrice = cycle === 'yearly'
            ? Number(newPlan.price_yearly ?? newPlan.price_monthly) * 12
            : Number(newPlan.price_monthly);
        return newPrice - oldPrice;
    }
    async issueProrationInvoice(clinicId, oldPlanId, newPlanId, cycleEndUnix) {
        if (!oldPlanId || oldPlanId === newPlanId)
            return;
        const [oldPlan, newPlan, clinic] = await Promise.all([
            this.prisma.plan.findUnique({ where: { id: oldPlanId } }),
            this.prisma.plan.findUnique({ where: { id: newPlanId } }),
            this.prisma.clinic.findUnique({ where: { id: clinicId } }),
        ]);
        if (!oldPlan || !newPlan || !clinic)
            return;
        const cycle = clinic.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
        const oldPrice = cycle === 'yearly'
            ? Number(oldPlan.price_yearly ?? oldPlan.price_monthly) * 12
            : Number(oldPlan.price_monthly);
        const newPrice = cycle === 'yearly'
            ? Number(newPlan.price_yearly ?? newPlan.price_monthly) * 12
            : Number(newPlan.price_monthly);
        const delta = newPrice - oldPrice;
        if (delta <= 0)
            return;
        const now = new Date();
        const cycleEnd = new Date(cycleEndUnix * 1000);
        const cycleStart = new Date(cycleEnd);
        if (cycle === 'yearly')
            cycleStart.setFullYear(cycleStart.getFullYear() - 1);
        else
            cycleStart.setMonth(cycleStart.getMonth() - 1);
        const totalMs = cycleEnd.getTime() - cycleStart.getTime();
        const remainingMs = Math.max(0, cycleEnd.getTime() - now.getTime());
        if (totalMs <= 0 || remainingMs <= 0)
            return;
        const ratio = remainingMs / totalMs;
        const proratedTotal = Math.round(delta * ratio * 100) / 100;
        if (proratedTotal < 1)
            return;
        await this.platformBilling.createManualInvoice({
            clinicId,
            planId: newPlanId,
            billingCycle: cycle,
            totalAmount: proratedTotal,
            periodStart: now,
            periodEnd: cycleEnd,
            dueDate: new Date(now.getTime() + 7 * 86_400_000),
            notes: `Prorated upgrade catch-up: ${oldPlan.name} → ${newPlan.name} (${Math.round(ratio * 100)}% of cycle remaining, ₹${delta.toFixed(2)}/cycle diff)`,
            sendImmediately: true,
        });
        this.logger.log(`Issued proration invoice for clinic ${clinicId}: ₹${proratedTotal} (${oldPlan.name} → ${newPlan.name}, ${Math.round(ratio * 100)}% cycle remaining)`);
    }
    async handleWebhook(body, signature, rawBody) {
        const webhookSecret = this.configService.get('razorpay.webhookSecret');
        if (webhookSecret && signature) {
            const bodyToVerify = rawBody || Buffer.from(JSON.stringify(body));
            const expectedSignature = (0, crypto_1.createHmac)('sha256', webhookSecret)
                .update(bodyToVerify)
                .digest('hex');
            if (expectedSignature !== signature) {
                this.logger.warn(`Webhook signature mismatch. Event: ${body?.event}`);
                throw new common_1.BadRequestException('Invalid webhook signature');
            }
            this.logger.log('Webhook signature verified');
        }
        const { event, payload } = body;
        this.logger.log(`Razorpay webhook: ${event}`);
        switch (event) {
            case 'subscription.activated':
                await this.handleSubscriptionActivated(payload.subscription?.entity);
                break;
            case 'subscription.charged':
                await this.handleSubscriptionCharged(payload.subscription?.entity, payload.payment?.entity);
                break;
            case 'subscription.cancelled':
                await this.handleSubscriptionCancelled(payload.subscription?.entity);
                break;
            case 'payment.captured':
                this.logger.log(`Payment captured: ${payload.payment?.entity?.['id']}`);
                break;
            case 'payment.failed':
                await this.handlePaymentFailed(payload.payment?.entity);
                break;
            case 'payment_link.paid':
                await this.handlePaymentLinkPaid(body.payload['payment_link'], payload.payment?.entity);
                break;
            case 'payment_link.expired':
            case 'payment_link.cancelled':
                await this.handlePaymentLinkInvalidated(body.payload['payment_link']);
                break;
            default:
                this.logger.warn(`Unhandled webhook event: ${event}`);
        }
    }
    async handlePaymentLinkPaid(paymentLink, payment) {
        if (!paymentLink?.entity)
            return;
        const link = paymentLink.entity;
        const linkId = link['id'];
        const referenceId = link['reference_id'];
        const paymentId = payment?.['id'] ?? link['payments']?.[0]?.payment_id ?? null;
        let invoice = linkId
            ? await this.prisma.platformInvoice.findFirst({ where: { razorpay_payment_link_id: linkId } })
            : null;
        if (!invoice && referenceId) {
            invoice = await this.prisma.platformInvoice.findFirst({ where: { invoice_number: referenceId } });
        }
        if (!invoice) {
            this.logger.warn(`payment_link.paid received but no platform invoice found (link=${linkId}, ref=${referenceId})`);
            return;
        }
        await this.platformBilling.markInvoicePaid(invoice.id, {
            razorpayPaymentId: paymentId,
            paidAt: new Date(),
        });
    }
    async handlePaymentLinkInvalidated(paymentLink) {
        if (!paymentLink?.entity)
            return;
        const linkId = paymentLink.entity['id'];
        if (!linkId)
            return;
        await this.prisma.platformInvoice.updateMany({
            where: { razorpay_payment_link_id: linkId, status: { in: ['due', 'overdue'] } },
            data: { payment_link_url: null, razorpay_payment_link_id: null },
        });
        this.logger.log(`Cleared expired/cancelled pay link ${linkId}`);
    }
    async handleSubscriptionActivated(subscription) {
        if (!subscription)
            return;
        const notes = subscription['notes'];
        const clinicId = notes?.['clinic_id'];
        const planId = notes?.['plan_id'];
        if (!clinicId)
            return;
        const nextBillingAt = subscription['current_end']
            ? new Date(Number(subscription['current_end']) * 1000)
            : null;
        await this.prisma.clinic.update({
            where: { id: clinicId },
            data: {
                subscription_status: 'active',
                ...(planId ? { plan_id: planId } : {}),
                ...(nextBillingAt ? { next_billing_at: nextBillingAt } : {}),
            },
        });
        this.logger.log(`Subscription activated for clinic ${clinicId}`);
    }
    async handleSubscriptionCharged(subscription, payment) {
        if (!payment)
            return;
        const notes = subscription?.['notes'];
        const clinicId = notes?.['clinic_id'];
        this.logger.log(`Payment received: ${payment['id']}, amount: ${payment['amount']}, clinic: ${clinicId || 'unknown'}`);
        if (clinicId) {
            const nextBillingAt = subscription?.['current_end']
                ? new Date(Number(subscription['current_end']) * 1000)
                : null;
            await this.prisma.clinic.update({
                where: { id: clinicId },
                data: {
                    subscription_status: 'active',
                    ...(nextBillingAt ? { next_billing_at: nextBillingAt } : {}),
                },
            });
            const paymentRef = payment['id'] ?? '';
            if (paymentRef) {
                await this.aiUsage
                    .settleOldestPendingFromPayment(clinicId, paymentRef)
                    .catch((err) => this.logger.warn(`AI overage settle failed for clinic ${clinicId}: ${err.message}`));
            }
            const amountInPaise = Number(payment['amount']) || 0;
            if (paymentRef && amountInPaise > 0) {
                const subscriptionId = subscription?.['id'] || null;
                const periodStart = subscription?.['current_start']
                    ? new Date(Number(subscription['current_start']) * 1000)
                    : null;
                const periodEnd = subscription?.['current_end']
                    ? new Date(Number(subscription['current_end']) * 1000)
                    : null;
                await this.platformBilling
                    .createInvoiceFromPayment({
                    clinicId,
                    razorpayPaymentId: paymentRef,
                    razorpaySubscriptionId: subscriptionId,
                    amountInPaise,
                    periodStart,
                    periodEnd,
                })
                    .catch((err) => this.logger.error(`Platform invoice creation failed for clinic ${clinicId} payment ${paymentRef}: ${err.message}`, err.stack));
            }
        }
    }
    async handleSubscriptionCancelled(subscription) {
        if (!subscription)
            return;
        const clinicId = subscription['notes']?.['clinic_id'];
        if (!clinicId)
            return;
        await this.prisma.clinic.update({
            where: { id: clinicId },
            data: { subscription_status: 'cancelled' },
        });
        this.logger.log(`Subscription cancelled for clinic ${clinicId}`);
    }
    async handlePaymentFailed(payment) {
        if (!payment)
            return;
        this.logger.warn(`Payment failed: ${payment['id']}, reason: ${payment['error_description']}`);
    }
    async cancelSubscription(clinicId) {
        if (!this.razorpay)
            throw new common_1.BadRequestException('Payment system not configured');
        const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
        if (!clinic)
            throw new common_1.BadRequestException('Clinic not found');
        if (!clinic.subscription_id)
            throw new common_1.BadRequestException('No active subscription');
        await this.razorpay.subscriptions.cancel(clinic.subscription_id);
        await this.prisma.clinic.update({
            where: { id: clinicId },
            data: { subscription_status: 'cancelled' },
        });
    }
    async handleTrialExpiry() {
        const now = new Date();
        const expiredTrials = await this.prisma.clinic.updateMany({
            where: {
                subscription_status: 'trial',
                trial_ends_at: { lt: now },
                is_complimentary: false,
            },
            data: { subscription_status: 'expired' },
        });
        if (expiredTrials.count > 0) {
            this.logger.log(`Expired ${expiredTrials.count} trial(s)`);
        }
    }
    async closeAiBillingCycles() {
        try {
            const closed = await this.aiUsage.closeEndedCycles();
            if (closed > 0) {
                this.logger.log(`Closed ${closed} AI billing cycle(s)`);
            }
        }
        catch (err) {
            this.logger.error(`Failed to close AI billing cycles: ${err.message}`);
        }
    }
};
exports.PaymentService = PaymentService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentService.prototype, "handleTrialExpiry", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentService.prototype, "closeAiBillingCycles", null);
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_js_1.PrismaService,
        ai_usage_service_js_1.AiUsageService,
        platform_billing_service_js_1.PlatformBillingService,
        clinic_feature_service_js_1.ClinicFeatureService])
], PaymentService);
function unwrapRazorpayError(err) {
    if (!err)
        return 'Unknown error';
    const e = err;
    const desc = e?.error?.description;
    const reason = e?.error?.reason;
    const code = e?.error?.code;
    const parts = [];
    if (desc)
        parts.push(desc);
    if (reason && reason !== desc)
        parts.push(`reason: ${reason}`);
    if (code)
        parts.push(`code: ${code}`);
    if (parts.length > 0)
        return parts.join(' — ');
    return e?.message || String(err);
}
//# sourceMappingURL=payment.service.js.map