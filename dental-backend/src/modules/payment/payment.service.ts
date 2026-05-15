import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { AiUsageService } from '../ai/ai-usage.service.js';
import { PlatformBillingService } from '../platform-billing/platform-billing.service.js';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';

interface CreateSubscriptionDto {
  clinicId: string;
  /** Either planKey (legacy: case-insensitive name match) or planId (preferred: exact UUID). */
  planKey?: string;
  planId?: string;
  /**
   * When the customer wants the plan change to take effect.
   *   - `now`       → Razorpay billing still flips at cycle end (no double-charge),
   *                   but `clinic.plan_id` is updated immediately and an upgrade
   *                   issues a prorated catch-up invoice for the remaining days
   *                   of the current cycle. Downgrade "now" applies new limits
   *                   immediately with no refund.
   *   - `cycle_end` → No immediate change. Plan flips at the next renewal.
   *                   Default for safety.
   * Ignored for first-time subscriptions (trial / expired / cancelled clinics)
   * — those always start immediately.
   */
  changeEffective?: 'now' | 'cycle_end';
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
    private readonly platformBilling: PlatformBillingService,
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
   * Create a Razorpay subscription for a clinic.
   *
   * Three real-world flows handled here:
   *   1. Trial / expired clinic subscribes for the first time → straight
   *      `subscriptions.create`.
   *   2. Active clinic switches plan → cancel the old subscription at the
   *      end of its current cycle (so the customer keeps the features they
   *      paid for), then create a new subscription for the new plan. The
   *      new subscription's first charge falls naturally at the cycle
   *      boundary; no double-charge.
   *   3. Re-subscribe after a cancellation → straight create (old sub is
   *      already in `cancelled` state).
   *
   * Plan resolution is by UUID first, falling back to exact (not partial)
   * case-insensitive name match. Partial matches were causing the wrong
   * plan to be picked when names overlapped (e.g. "Pro" → "Professional").
   */
  async createSubscription(dto: CreateSubscriptionDto): Promise<{ subscriptionId: string; shortUrl: string }> {
    if (!this.razorpay) throw new BadRequestException('Payment system not configured');
    if (!dto.planKey && !dto.planId) {
      throw new BadRequestException('planId or planKey is required');
    }

    const plan = dto.planId
      ? await this.prisma.plan.findUnique({ where: { id: dto.planId } })
      : await this.prisma.plan.findFirst({
          where: { name: { equals: dto.planKey, mode: 'insensitive' } },
        });
    if (!plan) throw new BadRequestException(`Plan "${dto.planId ?? dto.planKey}" not found`);
    if (!plan.razorpay_plan_id) {
      throw new BadRequestException('Razorpay plan not configured for this plan. Contact support.');
    }

    const clinic = await this.prisma.clinic.findUnique({ where: { id: dto.clinicId } });
    if (!clinic) throw new BadRequestException('Clinic not found');

    // No-op guard: clinic is already on this plan with an active subscription.
    if (
      clinic.plan_id === plan.id &&
      clinic.subscription_status === 'active' &&
      clinic.subscription_id
    ) {
      throw new BadRequestException('Clinic is already subscribed to this plan');
    }

    // For an active plan-change, first read the old subscription's state.
    // We need both `current_end` (so we can align the new sub's start_at to
    // it — no double-charge) and `status` (so we know whether the cancel
    // step is even meaningful).
    let oldSubStatus: string | null = null;
    let oldSubCurrentEnd: number | null = null;
    if (clinic.subscription_id) {
      try {
        const oldSub = await this.razorpay.subscriptions.fetch(clinic.subscription_id);
        oldSubStatus = (oldSub.status as string) || null;
        oldSubCurrentEnd = oldSub.current_end ? Number(oldSub.current_end) : null;
      } catch (e) {
        // Subscription doesn't exist on Razorpay anymore (test/prod mismatch,
        // deleted, etc). Treat the clinic as a fresh subscriber.
        this.logger.warn(
          `Old subscription ${clinic.subscription_id} not retrievable from Razorpay: ${unwrapRazorpayError(e)}`,
        );
      }
    }

    // Cancel-at-cycle-end only when there's actually a live subscription to
    // cancel. Razorpay refuses cancel() on subs in `created`/`pending` state
    // (not started yet — there's no cycle to end), so we skip those.
    if (
      clinic.subscription_id &&
      oldSubStatus &&
      ['authenticated', 'active', 'paused', 'halted'].includes(oldSubStatus)
    ) {
      try {
        await this.razorpay.subscriptions.cancel(clinic.subscription_id, true);
        this.logger.log(
          `Scheduled cycle-end cancellation of subscription ${clinic.subscription_id} for clinic ${dto.clinicId} (plan change to ${plan.name})`,
        );
      } catch (e) {
        const msg = unwrapRazorpayError(e);
        // Already cancelled / completed / expired — safe to ignore and proceed.
        if (!/already|completed|cancelled|expired/i.test(msg)) {
          this.logger.error(`Failed to cancel old subscription ${clinic.subscription_id}: ${msg}`);
          throw new BadRequestException(`Could not cancel existing subscription: ${msg}`);
        }
      }
    }

    // Determine start_at for the new subscription. Razorpay requires
    // start_at to be at least a few minutes in the future; if the old
    // subscription's current_end is already past (clinic flagged active
    // but cycle elapsed), skip alignment and let the new sub start now.
    let startAt: number | undefined;
    const nowSec = Math.floor(Date.now() / 1000);
    if (
      oldSubCurrentEnd &&
      oldSubCurrentEnd > nowSec + 15 * 60 && // at least 15 min in the future
      ['authenticated', 'active', 'paused'].includes(oldSubStatus ?? '')
    ) {
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
    } catch (e) {
      const msg = unwrapRazorpayError(e);
      this.logger.error(
        `Razorpay subscriptions.create failed for clinic ${dto.clinicId} (plan=${plan.name}, razorpay_plan_id=${plan.razorpay_plan_id}, start_at=${startAt ?? 'none'}): ${msg}`,
      );
      throw new BadRequestException(`Could not create subscription: ${msg}`);
    }

    // Preserve current subscription_status if the clinic is still in an
    // active cycle — only flip to 'created' for first-time subscribers.
    // The webhook flips to 'active' when the new subscription actually
    // starts charging.
    const newStatus = clinic.subscription_status === 'active' ? 'active' : 'created';
    const isActivePlanChange = clinic.subscription_status === 'active' && !!clinic.subscription_id;
    const changeEffective: 'now' | 'cycle_end' = isActivePlanChange
      ? (dto.changeEffective ?? 'cycle_end')
      : 'now'; // first-time / re-subscribe always starts immediately

    // Only flip plan_id on the clinic right now when the customer asked for
    // "apply now". Otherwise keep the current plan until the cycle boundary —
    // the Razorpay subscription.activated webhook will rotate plan_id when
    // the new subscription actually starts charging.
    await this.prisma.clinic.update({
      where: { id: dto.clinicId },
      data: {
        subscription_id: subscription.id,
        subscription_status: newStatus,
        ...(changeEffective === 'now' ? { plan_id: plan.id } : {}),
      },
    });

    // For an "apply now" upgrade, issue a prorated catch-up invoice for the
    // remaining days of the current cycle so the customer pays the price
    // difference up front (industry standard — Stripe / Chargebee call this a
    // "proration credit"). Downgrade-now does not generate a refund invoice;
    // we just apply the new (lower) limits immediately.
    if (isActivePlanChange && changeEffective === 'now' && startAt) {
      await this.issueProrationInvoice(clinic.id, clinic.plan_id, plan.id, startAt).catch((err) =>
        this.logger.warn(`Proration invoice failed for clinic ${clinic.id}: ${(err as Error).message}`),
      );
    }

    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url || '',
    };
  }

  /**
   * Issue a one-off prorated invoice for the price difference between the
   * old and new plan, covering the remaining days of the current billing
   * cycle. No-op when the new plan is the same price or cheaper.
   *
   *   delta_per_cycle = max(0, new_price - old_price)
   *   prorated_total  = delta_per_cycle * (days_remaining / total_cycle_days)
   *
   * The invoice is created in `due` state with a Pay link so the customer
   * is prompted to settle the difference immediately. The new Razorpay
   * subscription still kicks in at the next cycle, so the proration invoice
   * does NOT cover any future cycles — only the current one.
   */
  private async issueProrationInvoice(
    clinicId: string,
    oldPlanId: string | null,
    newPlanId: string,
    cycleEndUnix: number,
  ): Promise<void> {
    if (!oldPlanId || oldPlanId === newPlanId) return;

    const [oldPlan, newPlan, clinic] = await Promise.all([
      this.prisma.plan.findUnique({ where: { id: oldPlanId } }),
      this.prisma.plan.findUnique({ where: { id: newPlanId } }),
      this.prisma.clinic.findUnique({ where: { id: clinicId } }),
    ]);
    if (!oldPlan || !newPlan || !clinic) return;

    const cycle = clinic.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    const oldPrice = cycle === 'yearly'
      ? Number(oldPlan.price_yearly ?? oldPlan.price_monthly) * 12
      : Number(oldPlan.price_monthly);
    const newPrice = cycle === 'yearly'
      ? Number(newPlan.price_yearly ?? newPlan.price_monthly) * 12
      : Number(newPlan.price_monthly);

    const delta = newPrice - oldPrice;
    if (delta <= 0) return; // downgrade — no charge

    const now = new Date();
    const cycleEnd = new Date(cycleEndUnix * 1000);
    const cycleStart = new Date(cycleEnd);
    if (cycle === 'yearly') cycleStart.setFullYear(cycleStart.getFullYear() - 1);
    else cycleStart.setMonth(cycleStart.getMonth() - 1);

    const totalMs = cycleEnd.getTime() - cycleStart.getTime();
    const remainingMs = Math.max(0, cycleEnd.getTime() - now.getTime());
    if (totalMs <= 0 || remainingMs <= 0) return;

    const ratio = remainingMs / totalMs;
    const proratedTotal = Math.round(delta * ratio * 100) / 100;
    if (proratedTotal < 1) return; // skip negligible amounts under ₹1

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
      case 'payment_link.paid':
        await this.handlePaymentLinkPaid(
          (body.payload as Record<string, unknown>)['payment_link'] as { entity: Record<string, unknown> } | undefined,
          payload.payment?.entity,
        );
        break;
      case 'payment_link.expired':
      case 'payment_link.cancelled':
        await this.handlePaymentLinkInvalidated(
          (body.payload as Record<string, unknown>)['payment_link'] as { entity: Record<string, unknown> } | undefined,
        );
        break;
      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
    }
  }

  /**
   * Razorpay fired `payment_link.paid` — the customer paid an invoice we
   * issued via the hosted Pay Link. We look up the platform invoice via the
   * link's `reference_id` (our `invoice_number`), mark it paid, and update
   * the clinic's subscription state accordingly.
   */
  private async handlePaymentLinkPaid(
    paymentLink: { entity: Record<string, unknown> } | undefined,
    payment: Record<string, unknown> | undefined,
  ): Promise<void> {
    if (!paymentLink?.entity) return;
    const link = paymentLink.entity;
    const linkId = link['id'] as string | undefined;
    const referenceId = link['reference_id'] as string | undefined; // our invoice_number
    const paymentId = (payment?.['id'] as string) ?? (link['payments'] as Array<{ payment_id: string }> | null)?.[0]?.payment_id ?? null;

    // Prefer link_id (unique, set by us); only fall back to invoice_number
    // when link_id is missing or doesn't match (e.g. legacy or recycled links).
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

    // markInvoicePaid handles both invoice + clinic activation so online
    // (webhook) and offline (super-admin) paths converge on identical state.
    await this.platformBilling.markInvoicePaid(invoice.id, {
      razorpayPaymentId: paymentId,
      paidAt: new Date(),
    });
  }

  private async handlePaymentLinkInvalidated(
    paymentLink: { entity: Record<string, unknown> } | undefined,
  ): Promise<void> {
    if (!paymentLink?.entity) return;
    const linkId = paymentLink.entity['id'] as string | undefined;
    if (!linkId) return;
    // Don't change invoice status — the cron will flip due → overdue once
    // past due_date. Just clear the stale link so the next resend regenerates.
    await this.prisma.platformInvoice.updateMany({
      where: { razorpay_payment_link_id: linkId, status: { in: ['due', 'overdue'] } },
      data: { payment_link_url: null, razorpay_payment_link_id: null },
    });
    this.logger.log(`Cleared expired/cancelled pay link ${linkId}`);
  }

  private async handleSubscriptionActivated(subscription: Record<string, unknown> | undefined): Promise<void> {
    if (!subscription) return;
    const notes = subscription['notes'] as Record<string, string> | undefined;
    const clinicId = notes?.['clinic_id'];
    const planId = notes?.['plan_id'];
    if (!clinicId) return;

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

      // Issue a platform tax invoice for this payment (Smart Dental Desk →
      // clinic). Best-effort: failure here must not throw away the webhook,
      // since Razorpay will retry on non-2xx responses.
      const amountInPaise = Number(payment['amount']) || 0;
      if (paymentRef && amountInPaise > 0) {
        const subscriptionId = (subscription?.['id'] as string) || null;
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
          .catch((err) =>
            this.logger.error(
              `Platform invoice creation failed for clinic ${clinicId} payment ${paymentRef}: ${(err as Error).message}`,
              (err as Error).stack,
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

/**
 * Razorpay SDK throws errors with a nested `error.description` (Razorpay's
 * own error message) plus a generic top-level `message` like "Bad request".
 * Pull the most specific human-readable message out for logging + surfacing
 * to the client. Handles all the shapes we've seen in the wild.
 */
function unwrapRazorpayError(err: unknown): string {
  if (!err) return 'Unknown error';
  const e = err as {
    error?: { description?: string; code?: string; reason?: string };
    statusCode?: number;
    message?: string;
  };
  const desc = e?.error?.description;
  const reason = e?.error?.reason;
  const code = e?.error?.code;
  const parts: string[] = [];
  if (desc) parts.push(desc);
  if (reason && reason !== desc) parts.push(`reason: ${reason}`);
  if (code) parts.push(`code: ${code}`);
  if (parts.length > 0) return parts.join(' — ');
  return e?.message || String(err);
}
