import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { AiUsageService } from '../ai/ai-usage.service.js';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';

interface CreateSubscriptionDto {
  clinicId: string;
  planKey: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: Record<string, unknown> };
    payment?: { entity: Record<string, unknown> };
  };
}

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);
  private razorpay!: Razorpay;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly aiUsage: AiUsageService,
  ) {}

  onModuleInit() {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');
    if (keyId && keySecret) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    } else {
      this.logger.warn('Razorpay credentials not configured — payment features disabled');
    }
  }

  /**
   * Get subscription status for a clinic
   */
  async getSubscriptionStatus(clinicId: string) {
    if (!clinicId) throw new BadRequestException('Clinic ID is required');

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { plan: true },
    });
    if (!clinic) throw new BadRequestException('Clinic not found');

    const now = new Date();
    const trialEndsAt = clinic.trial_ends_at ? new Date(clinic.trial_ends_at) : null;
    const isTrialActive = clinic.subscription_status === 'trial' && trialEndsAt && trialEndsAt > now;
    const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    // Fetch live subscription details from Razorpay if active
    let billingDetails: {
      current_period_start: string | null;
      current_period_end: string | null;
      next_charge_at: string | null;
      paid_count: number;
      total_count: number;
      remaining_count: number;
      started_at: string | null;
      ended_at: string | null;
    } = {
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

        // Realign AI billing cycle to Razorpay subscription period
        if (sub.current_start && sub.current_end) {
          await this.aiUsage
            .syncCycleWithSubscription(
              clinicId,
              new Date(Number(sub.current_start) * 1000),
              new Date(Number(sub.current_end) * 1000),
            )
            .catch((err) =>
              this.logger.warn(`AI cycle sync failed for ${clinicId}: ${(err as Error).message}`),
            );
        }
      } catch (e) {
        this.logger.warn(`Failed to fetch Razorpay subscription ${clinic.subscription_id}: ${(e as Error).message}`);
      }
    }

    return {
      subscription_status: clinic.subscription_status,
      plan: clinic.plan ? { id: clinic.plan.id, name: clinic.plan.name, price_monthly: clinic.plan.price_monthly } : null,
      trial_ends_at: clinic.trial_ends_at,
      is_trial_active: isTrialActive,
      trial_days_left: trialDaysLeft,
      subscription_id: clinic.subscription_id,
      razorpay_key_id: this.configService.get<string>('razorpay.keyId') || '',
      ...billingDetails,
    };
  }

  /**
   * Get available plans for upgrade
   */
  async getPlans() {
    return this.prisma.plan.findMany({
      orderBy: { price_monthly: 'asc' },
      include: { plan_features: { include: { feature: true } } },
    });
  }

  /**
   * Create a Razorpay subscription for a clinic (trial→paid or plan change)
   */
  async createSubscription(dto: CreateSubscriptionDto): Promise<{ subscriptionId: string; shortUrl: string }> {
    if (!this.razorpay) throw new BadRequestException('Payment system not configured');

    const plan = await this.prisma.plan.findFirst({
      where: { name: { contains: dto.planKey, mode: 'insensitive' } },
    });
    if (!plan) throw new BadRequestException(`Plan "${dto.planKey}" not found`);

    const clinic = await this.prisma.clinic.findUnique({ where: { id: dto.clinicId } });
    if (!clinic) throw new BadRequestException('Clinic not found');

    if (!plan.razorpay_plan_id) throw new BadRequestException('Razorpay plan not configured for this plan. Contact support.');

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

    // Store subscription reference — mark as 'created' until Razorpay confirms payment
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

  /**
   * Handle Razorpay webhook events
   */
  async handleWebhook(body: RazorpayWebhookPayload, signature: string, rawBody?: Buffer): Promise<void> {
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret');
    if (webhookSecret && signature) {
      // Use raw body buffer if available (exact bytes Razorpay signed), fall back to JSON.stringify
      const bodyToVerify = rawBody || Buffer.from(JSON.stringify(body));
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(bodyToVerify)
        .digest('hex');

      if (expectedSignature !== signature) {
        this.logger.warn(`Webhook signature mismatch. Event: ${body?.event}`);
        throw new BadRequestException('Invalid webhook signature');
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
      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
    }
  }

  private async handleSubscriptionActivated(subscription: Record<string, unknown> | undefined): Promise<void> {
    if (!subscription) return;
    const notes = subscription['notes'] as Record<string, string> | undefined;
    const clinicId = notes?.['clinic_id'];
    const planId = notes?.['plan_id'];
    if (!clinicId) return;

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        subscription_status: 'active',
        ...(planId ? { plan_id: planId } : {}),
      },
    });
    this.logger.log(`Subscription activated for clinic ${clinicId}`);
  }

  private async handleSubscriptionCharged(
    subscription: Record<string, unknown> | undefined,
    payment: Record<string, unknown> | undefined,
  ): Promise<void> {
    if (!payment) return;
    const notes = subscription?.['notes'] as Record<string, string> | undefined;
    const clinicId = notes?.['clinic_id'];
    this.logger.log(`Payment received: ${payment['id']}, amount: ${payment['amount']}, clinic: ${clinicId || 'unknown'}`);

    // Ensure clinic stays active on successful recurring charge
    if (clinicId) {
      await this.prisma.clinic.update({
        where: { id: clinicId },
        data: { subscription_status: 'active' },
      });

      // Settle the oldest pending AI overage charge using this payment
      const paymentRef = (payment['id'] as string) ?? '';
      if (paymentRef) {
        await this.aiUsage
          .settleOldestPendingFromPayment(clinicId, paymentRef)
          .catch((err) =>
            this.logger.warn(
              `AI overage settle failed for clinic ${clinicId}: ${(err as Error).message}`,
            ),
          );
      }
    }
  }

  private async handleSubscriptionCancelled(subscription: Record<string, unknown> | undefined): Promise<void> {
    if (!subscription) return;
    const clinicId = (subscription['notes'] as Record<string, string>)?.['clinic_id'];
    if (!clinicId) return;

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { subscription_status: 'cancelled' },
    });
    this.logger.log(`Subscription cancelled for clinic ${clinicId}`);
  }

  private async handlePaymentFailed(payment: Record<string, unknown> | undefined): Promise<void> {
    if (!payment) return;
    this.logger.warn(`Payment failed: ${payment['id']}, reason: ${payment['error_description']}`);
  }

  /**
   * Cancel a clinic's subscription
   */
  async cancelSubscription(clinicId: string): Promise<void> {
    if (!this.razorpay) throw new BadRequestException('Payment system not configured');

    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new BadRequestException('Clinic not found');

    if (!clinic.subscription_id) throw new BadRequestException('No active subscription');

    await this.razorpay.subscriptions.cancel(clinic.subscription_id);

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { subscription_status: 'cancelled' },
    });
  }

  /**
   * Cron: Check for expired trials every day at midnight
   * Moves clinics from "trial" → "expired" when trial_ends_at < now
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTrialExpiry(): Promise<void> {
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

  /**
   * Cron: Close any AI billing cycles that have ended.
   * Aggregates overage usage into AiOverageCharge rows and resets per-cycle state.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async closeAiBillingCycles(): Promise<void> {
    try {
      const closed = await this.aiUsage.closeEndedCycles();
      if (closed > 0) {
        this.logger.log(`Closed ${closed} AI billing cycle(s)`);
      }
    } catch (err) {
      this.logger.error(`Failed to close AI billing cycles: ${(err as Error).message}`);
    }
  }
}
