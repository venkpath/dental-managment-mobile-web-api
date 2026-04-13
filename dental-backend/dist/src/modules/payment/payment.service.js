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
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = require("crypto");
let PaymentService = PaymentService_1 = class PaymentService {
    configService;
    prisma;
    logger = new common_1.Logger(PaymentService_1.name);
    razorpay;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
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
            }
            catch (e) {
                this.logger.warn(`Failed to fetch Razorpay subscription ${clinic.subscription_id}: ${e.message}`);
            }
        }
        return {
            subscription_status: clinic.subscription_status,
            plan: clinic.plan ? { id: clinic.plan.id, name: clinic.plan.name, price_monthly: clinic.plan.price_monthly } : null,
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
        const plan = await this.prisma.plan.findFirst({
            where: { name: { contains: dto.planKey, mode: 'insensitive' } },
        });
        if (!plan)
            throw new common_1.BadRequestException(`Plan "${dto.planKey}" not found`);
        const clinic = await this.prisma.clinic.findUnique({ where: { id: dto.clinicId } });
        if (!clinic)
            throw new common_1.BadRequestException('Clinic not found');
        if (!plan.razorpay_plan_id)
            throw new common_1.BadRequestException('Razorpay plan not configured for this plan. Contact support.');
        const subscription = await this.razorpay.subscriptions.create({
            plan_id: plan.razorpay_plan_id,
            total_count: 12,
            quantity: 1,
            notes: {
                clinic_id: dto.clinicId,
                plan_id: plan.id,
                plan_name: plan.name,
            },
        });
        await this.prisma.clinic.update({
            where: { id: dto.clinicId },
            data: {
                subscription_id: subscription.id,
                subscription_status: 'created',
                plan_id: plan.id,
            },
        });
        return {
            subscriptionId: subscription.id,
            shortUrl: subscription.short_url || '',
        };
    }
    async handleWebhook(body, signature) {
        const webhookSecret = this.configService.get('razorpay.webhookSecret');
        if (webhookSecret) {
            const expectedSignature = (0, crypto_1.createHmac)('sha256', webhookSecret)
                .update(JSON.stringify(body))
                .digest('hex');
            if (expectedSignature !== signature) {
                throw new common_1.BadRequestException('Invalid webhook signature');
            }
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
            case 'payment.failed':
                await this.handlePaymentFailed(payload.payment?.entity);
                break;
            default:
                this.logger.warn(`Unhandled webhook event: ${event}`);
        }
    }
    async handleSubscriptionActivated(subscription) {
        if (!subscription)
            return;
        const notes = subscription['notes'];
        const clinicId = notes?.['clinic_id'];
        const planId = notes?.['plan_id'];
        if (!clinicId)
            return;
        await this.prisma.clinic.update({
            where: { id: clinicId },
            data: {
                subscription_status: 'active',
                ...(planId ? { plan_id: planId } : {}),
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
            await this.prisma.clinic.update({
                where: { id: clinicId },
                data: { subscription_status: 'active' },
            });
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
            },
            data: { subscription_status: 'expired' },
        });
        if (expiredTrials.count > 0) {
            this.logger.log(`Expired ${expiredTrials.count} trial(s)`);
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
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_js_1.PrismaService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map