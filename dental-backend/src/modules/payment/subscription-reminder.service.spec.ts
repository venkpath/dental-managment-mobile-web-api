import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionReminderService } from './subscription-reminder.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';

const clinicId = 'clinic-uuid-0001';

const mockAdmin = { id: 'user-1', name: 'Dr. Admin', phone: '9999999999', role: 'admin', created_at: new Date() };

const mockClinic = {
  id: clinicId,
  name: 'Test Clinic',
  subscription_status: 'trial',
  trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  next_billing_at: null,
  plan: { name: 'Pro', price_monthly: 999, price_yearly: null },
};

const mockPrisma = {
  clinic: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
  messageTemplate: { findFirst: jest.fn() },
  communicationMessage: { findFirst: jest.fn() },
};

const mockCommunicationService = {
  sendStaffWhatsAppTemplate: jest.fn(),
};

const mockAutomationService = {
  getRuleConfig: jest.fn(),
};

describe('SubscriptionReminderService', () => {
  let service: SubscriptionReminderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionReminderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommunicationService, useValue: mockCommunicationService },
        { provide: AutomationService, useValue: mockAutomationService },
      ],
    }).compile();

    service = module.get<SubscriptionReminderService>(SubscriptionReminderService);
    jest.clearAllMocks();

    mockPrisma.clinic.findMany.mockResolvedValue([mockClinic]);
    mockPrisma.user.findMany.mockResolvedValue([mockAdmin]);
    mockPrisma.messageTemplate.findFirst.mockResolvedValue({ id: 'tpl-1', template_name: 'platform_trial_ending_soon' });
    mockPrisma.communicationMessage.findFirst.mockResolvedValue(null); // not already sent
    mockAutomationService.getRuleConfig.mockResolvedValue({ is_enabled: true, config: {} });
    mockCommunicationService.sendStaffWhatsAppTemplate.mockResolvedValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── sendDailyReminders ──────────────────────────────────────

  describe('sendDailyReminders', () => {
    it('should run all three reminder processes without throwing', async () => {
      await expect(service.sendDailyReminders()).resolves.not.toThrow();
    });

    it('should not throw when an individual clinic fails', async () => {
      mockPrisma.user.findMany.mockRejectedValueOnce(new Error('DB timeout'));
      await expect(service.sendDailyReminders()).resolves.not.toThrow();
    });
  });

  // ─── Trial reminders ─────────────────────────────────────────

  describe('trial reminder logic', () => {
    it('should send trial reminder for clinic with trial ending in 3 days', async () => {
      // trial_ends_at = 3 days from now → should trigger 'platform_trial_ending_soon'
      mockPrisma.clinic.findMany
        .mockResolvedValueOnce([mockClinic]) // trial query
        .mockResolvedValueOnce([])           // renewal query
        .mockResolvedValueOnce([]);          // expired query

      await service.sendDailyReminders();

      expect(mockCommunicationService.sendStaffWhatsAppTemplate).toHaveBeenCalledWith(
        clinicId,
        mockAdmin.phone,
        'platform_trial_ending_soon',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should skip trial reminder when automation rule is disabled', async () => {
      mockAutomationService.getRuleConfig.mockResolvedValueOnce({ is_enabled: false, config: {} });
      mockPrisma.clinic.findMany
        .mockResolvedValueOnce([mockClinic])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.sendDailyReminders();
      expect(mockCommunicationService.sendStaffWhatsAppTemplate).not.toHaveBeenCalled();
    });

    it('should skip trial reminder when already sent today', async () => {
      mockPrisma.communicationMessage.findFirst.mockResolvedValueOnce({ id: 'msg-1' });
      mockPrisma.clinic.findMany
        .mockResolvedValueOnce([mockClinic])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.sendDailyReminders();
      expect(mockCommunicationService.sendStaffWhatsAppTemplate).not.toHaveBeenCalled();
    });

    it('should skip when no admin with phone found', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([{ ...mockAdmin, phone: null }]);
      mockPrisma.clinic.findMany
        .mockResolvedValueOnce([mockClinic])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.sendDailyReminders();
      expect(mockCommunicationService.sendStaffWhatsAppTemplate).not.toHaveBeenCalled();
    });
  });

  // ─── Renewal reminders ───────────────────────────────────────

  describe('renewal reminder logic', () => {
    it('should send renewal reminder for active clinic with billing due in 7 days', async () => {
      const activeClinic = {
        ...mockClinic,
        subscription_status: 'active',
        trial_ends_at: null,
        next_billing_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      mockPrisma.clinic.findMany
        .mockResolvedValueOnce([])           // trial query
        .mockResolvedValueOnce([activeClinic]) // renewal query
        .mockResolvedValueOnce([]);          // expired query

      await service.sendDailyReminders();

      expect(mockCommunicationService.sendStaffWhatsAppTemplate).toHaveBeenCalledWith(
        clinicId,
        mockAdmin.phone,
        'platform_subscription_renewal_reminder',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  // ─── Expired reminders ───────────────────────────────────────

  describe('expired reminder logic', () => {
    it('should send expired reminder for clinic expired today', async () => {
      const expiredClinic = {
        ...mockClinic,
        subscription_status: 'expired',
        trial_ends_at: new Date(), // today
        next_billing_at: null,
      };
      mockPrisma.clinic.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredClinic]);

      await service.sendDailyReminders();

      expect(mockCommunicationService.sendStaffWhatsAppTemplate).toHaveBeenCalledWith(
        clinicId,
        mockAdmin.phone,
        'platform_subscription_expired',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
