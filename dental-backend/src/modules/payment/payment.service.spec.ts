import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AiUsageService } from '../ai/ai-usage.service.js';
import { PlatformBillingService } from '../platform-billing/platform-billing.service.js';
import { createHmac } from 'crypto';

const clinicId = 'clinic-uuid-0001';

const mockPrisma = {
  clinic: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  plan: { findMany: jest.fn(), findFirst: jest.fn() },
};

const mockConfig = { get: jest.fn() };

const mockAiUsage = {
  syncCycleWithSubscription: jest.fn(),
  settleOldestPendingFromPayment: jest.fn(),
  closeEndedCycles: jest.fn(),
};

const mockPlatformBilling = { createInvoiceFromPayment: jest.fn() };

const mockRazorpaySubscription = {
  id: 'sub_test123',
  short_url: 'https://rzp.io/l/test',
  current_start: 1700000000,
  current_end: 1702592000,
  charge_at: 1702592000,
  paid_count: 1,
  total_count: 12,
  remaining_count: 11,
  start_at: 1700000000,
  ended_at: null,
};

const mockRazorpay = {
  subscriptions: {
    fetch: jest.fn(),
    create: jest.fn(),
    cancel: jest.fn(),
  },
};

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => mockRazorpay);
});

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'razorpay.keyId') return 'rzp_test_key';
      if (key === 'razorpay.keySecret') return 'test_secret';
      if (key === 'razorpay.webhookSecret') return 'webhook_secret';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AiUsageService, useValue: mockAiUsage },
        { provide: PlatformBillingService, useValue: mockPlatformBilling },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    service.onModuleInit();
    jest.clearAllMocks();

    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'razorpay.keyId') return 'rzp_test_key';
      if (key === 'razorpay.keySecret') return 'test_secret';
      if (key === 'razorpay.webhookSecret') return 'webhook_secret';
      return undefined;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getSubscriptionStatus ───────────────────────────────────

  describe('getSubscriptionStatus', () => {
    const clinic = {
      id: clinicId,
      subscription_status: 'active',
      trial_ends_at: null,
      subscription_id: 'sub_test123',
      plan: { id: 'plan-1', name: 'Pro', price_monthly: 999 },
    };

    beforeEach(() => {
      mockPrisma.clinic.findUnique.mockResolvedValue(clinic);
      mockRazorpay.subscriptions.fetch.mockResolvedValue(mockRazorpaySubscription);
      mockAiUsage.syncCycleWithSubscription.mockResolvedValue(undefined);
    });

    it('should throw BadRequestException when clinicId is empty', async () => {
      await expect(service.getSubscriptionStatus('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when clinic not found', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(service.getSubscriptionStatus(clinicId)).rejects.toThrow(BadRequestException);
    });

    it('should return subscription status with plan info', async () => {
      const result = await service.getSubscriptionStatus(clinicId);
      expect(result.subscription_status).toBe('active');
      expect(result.plan?.name).toBe('Pro');
      expect(result.subscription_id).toBe('sub_test123');
    });

    it('should compute trial fields when trial is active', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      mockPrisma.clinic.findUnique.mockResolvedValueOnce({
        ...clinic,
        subscription_status: 'trial',
        trial_ends_at: futureDate,
        subscription_id: null,
      });
      const result = await service.getSubscriptionStatus(clinicId);
      expect(result.is_trial_active).toBe(true);
      expect(result.trial_days_left).toBeGreaterThan(0);
    });

    it('should mark trial as expired when trial_ends_at is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000);
      mockPrisma.clinic.findUnique.mockResolvedValueOnce({
        ...clinic,
        subscription_status: 'trial',
        trial_ends_at: pastDate,
        subscription_id: null,
      });
      const result = await service.getSubscriptionStatus(clinicId);
      expect(result.is_trial_active).toBe(false);
      expect(result.trial_days_left).toBe(0);
    });

    it('should fetch Razorpay subscription and populate billing details', async () => {
      const result = await service.getSubscriptionStatus(clinicId);
      expect(mockRazorpay.subscriptions.fetch).toHaveBeenCalledWith('sub_test123');
      expect(result.paid_count).toBe(1);
      expect(result.total_count).toBe(12);
    });

    it('should call syncCycleWithSubscription when Razorpay period is available', async () => {
      await service.getSubscriptionStatus(clinicId);
      expect(mockAiUsage.syncCycleWithSubscription).toHaveBeenCalledWith(
        clinicId,
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should not throw if Razorpay fetch fails — degrades gracefully', async () => {
      mockRazorpay.subscriptions.fetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await service.getSubscriptionStatus(clinicId);
      expect(result.subscription_status).toBe('active');
      expect(result.paid_count).toBe(0);
    });
  });

  // ─── getPlans ────────────────────────────────────────────────

  describe('getPlans', () => {
    it('should return plans ordered by price', async () => {
      const plans = [{ id: '1', name: 'Basic', price_monthly: 499 }];
      mockPrisma.plan.findMany.mockResolvedValue(plans);
      const result = await service.getPlans();
      expect(result).toEqual(plans);
      expect(mockPrisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { price_monthly: 'asc' } }),
      );
    });
  });

  // ─── createSubscription ───────────────────────────────────────

  describe('createSubscription', () => {
    const dto = { clinicId, planKey: 'pro' };
    const plan = { id: 'plan-1', name: 'Pro', razorpay_plan_id: 'rp_plan_123' };

    beforeEach(() => {
      mockPrisma.plan.findFirst.mockResolvedValue(plan);
      mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId });
      mockRazorpay.subscriptions.create.mockResolvedValue({
        id: 'sub_new123',
        short_url: 'https://rzp.io/l/new',
      });
      mockPrisma.clinic.update.mockResolvedValue({});
    });

    it('should create a subscription and return subscriptionId + shortUrl', async () => {
      const result = await service.createSubscription(dto);
      expect(result.subscriptionId).toBe('sub_new123');
      expect(result.shortUrl).toBe('https://rzp.io/l/new');
    });

    it('should update clinic with subscription_id and status=created', async () => {
      await service.createSubscription(dto);
      expect(mockPrisma.clinic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: clinicId },
          data: expect.objectContaining({ subscription_status: 'created' }),
        }),
      );
    });

    it('should throw BadRequestException when plan not found', async () => {
      mockPrisma.plan.findFirst.mockResolvedValueOnce(null);
      await expect(service.createSubscription(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when clinic not found', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(service.createSubscription(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when plan has no razorpay_plan_id', async () => {
      mockPrisma.plan.findFirst.mockResolvedValueOnce({ ...plan, razorpay_plan_id: null });
      await expect(service.createSubscription(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── handleWebhook ───────────────────────────────────────────

  describe('handleWebhook', () => {
    const webhookSecret = 'webhook_secret';

    function makeSignature(body: object): string {
      return createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');
    }

    it('should throw BadRequestException on invalid signature', async () => {
      const body = { event: 'subscription.activated', payload: {} };
      await expect(
        service.handleWebhook(body as any, 'bad-signature'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process subscription.activated and update clinic to active', async () => {
      const body = {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: {
              notes: { clinic_id: clinicId, plan_id: 'plan-1' },
              current_end: 1702592000,
            },
          },
        },
      };
      const sig = makeSignature(body);
      mockPrisma.clinic.update.mockResolvedValue({});

      await service.handleWebhook(body as any, sig);

      expect(mockPrisma.clinic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: clinicId },
          data: expect.objectContaining({ subscription_status: 'active' }),
        }),
      );
    });

    it('should process subscription.cancelled and update clinic to cancelled', async () => {
      const body = {
        event: 'subscription.cancelled',
        payload: {
          subscription: {
            entity: { notes: { clinic_id: clinicId } },
          },
        },
      };
      const sig = makeSignature(body);
      mockPrisma.clinic.update.mockResolvedValue({});

      await service.handleWebhook(body as any, sig);

      expect(mockPrisma.clinic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscription_status: 'cancelled' }),
        }),
      );
    });

    it('should process subscription.charged and keep clinic active', async () => {
      const body = {
        event: 'subscription.charged',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test',
              notes: { clinic_id: clinicId },
              current_start: 1700000000,
              current_end: 1702592000,
            },
          },
          payment: { entity: { id: 'pay_123', amount: 99900 } },
        },
      };
      const sig = makeSignature(body);
      mockPrisma.clinic.update.mockResolvedValue({});
      mockAiUsage.settleOldestPendingFromPayment.mockResolvedValue(undefined);
      mockPlatformBilling.createInvoiceFromPayment.mockResolvedValue({});

      await service.handleWebhook(body as any, sig);

      expect(mockPrisma.clinic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subscription_status: 'active' }),
        }),
      );
      expect(mockAiUsage.settleOldestPendingFromPayment).toHaveBeenCalledWith(clinicId, 'pay_123');
    });

    it('should skip signature check when webhookSecret is not set', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'razorpay.webhookSecret') return undefined;
        return 'val';
      });
      const body = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x' } } } };
      await expect(service.handleWebhook(body as any, 'any-sig')).resolves.not.toThrow();
    });
  });

  // ─── cancelSubscription ──────────────────────────────────────

  describe('cancelSubscription', () => {
    beforeEach(() => {
      mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId, subscription_id: 'sub_123' });
      mockRazorpay.subscriptions.cancel.mockResolvedValue({});
      mockPrisma.clinic.update.mockResolvedValue({});
    });

    it('should cancel subscription and update clinic status', async () => {
      await service.cancelSubscription(clinicId);
      expect(mockRazorpay.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
      expect(mockPrisma.clinic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { subscription_status: 'cancelled' },
        }),
      );
    });

    it('should throw BadRequestException when clinic not found', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(service.cancelSubscription(clinicId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no subscription exists', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValueOnce({ id: clinicId, subscription_id: null });
      await expect(service.cancelSubscription(clinicId)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── handleTrialExpiry (cron) ─────────────────────────────────

  describe('handleTrialExpiry', () => {
    it('should expire overdue trials', async () => {
      mockPrisma.clinic.updateMany.mockResolvedValue({ count: 3 });
      await service.handleTrialExpiry();
      expect(mockPrisma.clinic.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subscription_status: 'trial' }),
          data: { subscription_status: 'expired' },
        }),
      );
    });

    it('should not log when no trials expired', async () => {
      mockPrisma.clinic.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.handleTrialExpiry()).resolves.not.toThrow();
    });
  });

  // ─── closeAiBillingCycles (cron) ─────────────────────────────

  describe('closeAiBillingCycles', () => {
    it('should delegate to aiUsage.closeEndedCycles', async () => {
      mockAiUsage.closeEndedCycles.mockResolvedValue(2);
      await service.closeAiBillingCycles();
      expect(mockAiUsage.closeEndedCycles).toHaveBeenCalled();
    });

    it('should not throw when closeEndedCycles fails', async () => {
      mockAiUsage.closeEndedCycles.mockRejectedValueOnce(new Error('DB timeout'));
      await expect(service.closeAiBillingCycles()).resolves.not.toThrow();
    });
  });
});
