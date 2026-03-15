import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
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
   * Create a Razorpay subscription for a clinic
   */
  async createSubscription(dto: CreateSubscriptionDto): Promise<{ subscriptionId: string; shortUrl: string }> {
    if (!this.razorpay) throw new BadRequestException('Payment system not configured');

    // Look up the plan to get the Razorpay plan ID
    const plan = await this.prisma.plan.findFirst({
      where: { name: { contains: dto.planKey, mode: 'insensitive' } },
    });

    if (!plan) throw new BadRequestException(`Plan "${dto.planKey}" not found`);

    const clinic = await this.prisma.clinic.findUnique({ where: { id: dto.clinicId } });
    if (!clinic) throw new BadRequestException('Clinic not found');

    // Get or create Razorpay plan ID from plan metadata
    const razorpayPlanId = (plan as unknown as Record<string, unknown>)['razorpay_plan_id'] as string | undefined;
    if (!razorpayPlanId) throw new BadRequestException('Razorpay plan not configured for this plan');

    const subscription = await this.razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 12,
      quantity: 1,
      notes: {
        clinic_id: dto.clinicId,
        plan_name: plan.name,
      },
    });

    // Store subscription reference
    await this.prisma.clinic.update({
      where: { id: dto.clinicId },
      data: {
        subscription_id: subscription.id,
        subscription_status: 'created',
      } as Record<string, unknown>,
    });

    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url || '',
    };
  }

  /**
   * Handle Razorpay webhook events
   */
  async handleWebhook(body: RazorpayWebhookPayload, signature: string): Promise<void> {
    // Verify webhook signature
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret');
    if (webhookSecret) {
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const { event, payload } = body;
    this.logger.log(`Razorpay webhook: ${event}`);

    switch (event) {
      case 'subscription.activated':
        await this.handleSubscriptionActivated(payload.subscription?.entity);
        break;
      case 'subscription.charged':
        await this.handleSubscriptionCharged(payload.payment?.entity);
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

  private async handleSubscriptionActivated(subscription: Record<string, unknown> | undefined): Promise<void> {
    if (!subscription) return;
    const clinicId = (subscription['notes'] as Record<string, string>)?.['clinic_id'];
    if (!clinicId) return;

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        subscription_status: 'active',
      } as Record<string, unknown>,
    });
    this.logger.log(`Subscription activated for clinic ${clinicId}`);
  }

  private async handleSubscriptionCharged(payment: Record<string, unknown> | undefined): Promise<void> {
    if (!payment) return;
    this.logger.log(`Payment received: ${payment['id']}, amount: ${payment['amount']}`);
  }

  private async handleSubscriptionCancelled(subscription: Record<string, unknown> | undefined): Promise<void> {
    if (!subscription) return;
    const clinicId = (subscription['notes'] as Record<string, string>)?.['clinic_id'];
    if (!clinicId) return;

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        subscription_status: 'cancelled',
      } as Record<string, unknown>,
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

    const subscriptionId = (clinic as unknown as Record<string, unknown>)['subscription_id'] as string | undefined;
    if (!subscriptionId) throw new BadRequestException('No active subscription');

    await this.razorpay.subscriptions.cancel(subscriptionId);

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { subscription_status: 'cancelled' } as Record<string, unknown>,
    });
  }
}
