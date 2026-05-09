import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AutomationService } from './automation.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = 'clinic-uuid-0001';

const mockRule = {
  id: 'rule-uuid-0001',
  clinic_id: clinicId,
  rule_type: 'appointment_reminder_patient',
  is_enabled: true,
  channel: 'preferred',
  template_id: null,
  config: { reminder_1_hours: 24, reminder_2_hours: 2 },
  template: null,
};

const mockPrisma = {
  automationRule: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    createMany: jest.fn(),
  },
};

describe('AutomationService', () => {
  let service: AutomationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
    jest.clearAllMocks();

    mockPrisma.automationRule.findMany.mockResolvedValue([mockRule]);
    mockPrisma.automationRule.findUnique.mockResolvedValue(mockRule);
    mockPrisma.automationRule.upsert.mockResolvedValue(mockRule);
    mockPrisma.automationRule.createMany.mockResolvedValue({ count: 0 });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getAllRules ──────────────────────────────────────────────

  describe('getAllRules', () => {
    it('should return existing rules and seed defaults', async () => {
      // All default types are present so no re-fetch
      const allDefaultTypes = [
        'birthday_greeting', 'festival_greeting', 'post_treatment_care',
        'no_show_followup', 'dormant_reactivation', 'treatment_plan_reminder',
        'payment_reminder', 'feedback_collection', 'appointment_reminder_patient',
        'appointment_confirmation', 'appointment_cancellation', 'appointment_rescheduled',
        'payment_confirmation', 'invoice_ready', 'payment_overdue', 'prescription_ready',
      ];
      const allRules = allDefaultTypes.map((rt) => ({ ...mockRule, rule_type: rt }));
      mockPrisma.automationRule.findMany.mockResolvedValue(allRules);

      const result = await service.getAllRules(clinicId);
      expect(result.length).toBe(allDefaultTypes.length);
      expect(mockPrisma.automationRule.createMany).toHaveBeenCalled();
    });

    it('should re-fetch when some default types are missing', async () => {
      // Only one rule returned initially — triggers re-fetch
      mockPrisma.automationRule.findMany
        .mockResolvedValueOnce([mockRule]) // first fetch
        .mockResolvedValueOnce([mockRule]); // re-fetch after seed

      await service.getAllRules(clinicId);
      expect(mockPrisma.automationRule.findMany).toHaveBeenCalledTimes(2);
    });

    it('should always call seedDefaults (createMany with skipDuplicates)', async () => {
      await service.getAllRules(clinicId);
      expect(mockPrisma.automationRule.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });
  });

  // ─── getRule ─────────────────────────────────────────────────

  describe('getRule', () => {
    it('should return a rule by type', async () => {
      const result = await service.getRule(clinicId, 'appointment_reminder_patient');
      expect(result).toEqual(mockRule);
    });

    it('should throw NotFoundException for unknown rule type', async () => {
      mockPrisma.automationRule.findUnique.mockResolvedValueOnce(null);
      await expect(service.getRule(clinicId, 'nonexistent_rule')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── upsertRule ──────────────────────────────────────────────

  describe('upsertRule', () => {
    it('should upsert a rule with provided dto', async () => {
      const dto = { is_enabled: false, channel: 'whatsapp' as const };
      const result = await service.upsertRule(clinicId, 'birthday_greeting', dto);
      expect(mockPrisma.automationRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinic_id_rule_type: { clinic_id: clinicId, rule_type: 'birthday_greeting' } },
          update: expect.objectContaining({ is_enabled: false, channel: 'whatsapp' }),
        }),
      );
      expect(result).toEqual(mockRule);
    });

    it('should default is_enabled to true on create', async () => {
      await service.upsertRule(clinicId, 'birthday_greeting', { channel: 'preferred' as const } as any);
      expect(mockPrisma.automationRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ is_enabled: true }),
        }),
      );
    });
  });

  // ─── isRuleEnabled ───────────────────────────────────────────

  describe('isRuleEnabled', () => {
    it('should return rule.is_enabled when rule exists', async () => {
      mockPrisma.automationRule.findUnique.mockResolvedValueOnce({ is_enabled: true });
      const result = await service.isRuleEnabled(clinicId, 'appointment_reminder_patient' as any);
      expect(result).toBe(true);
    });

    it('should return true for appointment_reminder_patient when rule missing', async () => {
      mockPrisma.automationRule.findUnique.mockResolvedValueOnce(null);
      const result = await service.isRuleEnabled(clinicId, 'appointment_reminder_patient' as any);
      expect(result).toBe(true);
    });

    it('should return true for payment_reminder when rule missing', async () => {
      mockPrisma.automationRule.findUnique.mockResolvedValueOnce(null);
      const result = await service.isRuleEnabled(clinicId, 'payment_reminder' as any);
      expect(result).toBe(true);
    });

    it('should return false for marketing rule when rule missing', async () => {
      mockPrisma.automationRule.findUnique.mockResolvedValueOnce(null);
      const result = await service.isRuleEnabled(clinicId, 'birthday_greeting' as any);
      expect(result).toBe(false);
    });
  });

  // ─── getRuleConfig ───────────────────────────────────────────

  describe('getRuleConfig', () => {
    it('should return rule config with template included', async () => {
      const result = await service.getRuleConfig(clinicId, 'appointment_reminder_patient' as any);
      expect(result).toEqual(mockRule);
    });

    it('should return null when rule does not exist', async () => {
      mockPrisma.automationRule.findUnique.mockResolvedValueOnce(null);
      const result = await service.getRuleConfig(clinicId, 'birthday_greeting' as any);
      expect(result).toBeNull();
    });
  });
});
