import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = 'clinic-uuid-0001';
const cycleStart = new Date('2026-01-01T00:00:00Z');
const cycleEnd = new Date('2026-01-31T00:00:00Z');

const mockSettings = {
  clinic_id: clinicId,
  overage_enabled: false,
  approved_extra: 0,
  used_in_cycle: 5,
  current_cycle_start: cycleStart,
  current_cycle_end: cycleEnd,
};

const mockPrisma = {
  clinicAiSettings: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  clinic: { findUnique: jest.fn() },
  aiOverageCharge: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  aiQuotaApprovalRequest: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  aiUsageRecord: {
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AiUsageService', () => {
  let service: AiUsageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiUsageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AiUsageService>(AiUsageService);
    jest.clearAllMocks();

    mockPrisma.clinicAiSettings.findUnique.mockResolvedValue(mockSettings);
    mockPrisma.clinicAiSettings.create.mockResolvedValue(mockSettings);
    mockPrisma.clinicAiSettings.update.mockResolvedValue(mockSettings);
    mockPrisma.clinicAiSettings.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clinic.findUnique.mockResolvedValue({
      plan: { name: 'Pro', ai_quota: 100, ai_overage_cap: 200 },
    });
    mockPrisma.aiOverageCharge.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── ensureSettings ──────────────────────────────────────────

  describe('ensureSettings', () => {
    it('should return existing settings without creating new ones', async () => {
      const result = await service.ensureSettings(clinicId);
      expect(result).toEqual(mockSettings);
      expect(mockPrisma.clinicAiSettings.create).not.toHaveBeenCalled();
    });

    it('should create settings when none exist', async () => {
      mockPrisma.clinicAiSettings.findUnique.mockResolvedValueOnce(null);
      await service.ensureSettings(clinicId);
      expect(mockPrisma.clinicAiSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clinic_id: clinicId }),
        }),
      );
    });
  });

  // ─── snapshot ────────────────────────────────────────────────

  describe('snapshot', () => {
    it('should return correct effective_quota for base only', async () => {
      const snap = await service.snapshot(clinicId);
      expect(snap.base_quota).toBe(100);
      expect(snap.effective_quota).toBe(100); // overage_enabled=false, approved_extra=0
      expect(snap.is_blocked_unpaid).toBe(false);
    });

    it('should include overage headroom when overage_enabled is true', async () => {
      mockPrisma.clinicAiSettings.findUnique.mockResolvedValueOnce({ ...mockSettings, overage_enabled: true });
      // second call from ensureSettings within snapshot path
      mockPrisma.clinicAiSettings.findUnique.mockResolvedValueOnce({ ...mockSettings, overage_enabled: true });
      const snap = await service.snapshot(clinicId);
      expect(snap.effective_quota).toBeGreaterThan(snap.base_quota);
    });

    it('should set is_blocked_unpaid when pending overage charge exists', async () => {
      mockPrisma.aiOverageCharge.findFirst.mockResolvedValueOnce({ id: 'charge-1' });
      const snap = await service.snapshot(clinicId);
      expect(snap.is_blocked_unpaid).toBe(true);
      expect(snap.pending_charge_id).toBe('charge-1');
    });

    it('should return zero effective_quota when clinic has no plan', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValueOnce({ plan: null });
      const snap = await service.snapshot(clinicId);
      expect(snap.base_quota).toBe(0);
      expect(snap.effective_quota).toBe(0);
    });
  });

  // ─── reserveSlot ─────────────────────────────────────────────

  describe('reserveSlot', () => {
    it('should reserve a slot when quota is available', async () => {
      // used_in_cycle=5, effective_quota=100
      const snap = await service.reserveSlot(clinicId);
      expect(mockPrisma.clinicAiSettings.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { used_in_cycle: { increment: 1 } } }),
      );
      expect(snap.used_in_cycle).toBe(6);
    });

    it('should throw ForbiddenException when unpaid overage charge blocks access', async () => {
      mockPrisma.aiOverageCharge.findFirst.mockResolvedValueOnce({ id: 'charge-1' });
      await expect(service.reserveSlot(clinicId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when effective_quota is zero (no plan)', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValueOnce({ plan: null });
      await expect(service.reserveSlot(clinicId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when quota is exhausted (updateMany count=0)', async () => {
      mockPrisma.clinicAiSettings.updateMany.mockResolvedValueOnce({ count: 0 });
      // Simulate: used_in_cycle >= effective_quota
      mockPrisma.clinicAiSettings.findUnique.mockResolvedValue({
        ...mockSettings,
        used_in_cycle: 100,
        overage_enabled: false,
      });
      await expect(service.reserveSlot(clinicId)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── releaseReservation ──────────────────────────────────────

  describe('releaseReservation', () => {
    it('should decrement used_in_cycle', async () => {
      await service.releaseReservation(clinicId);
      expect(mockPrisma.clinicAiSettings.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { used_in_cycle: { decrement: 1 } } }),
      );
    });
  });

  // ─── recordUsage ─────────────────────────────────────────────

  describe('recordUsage', () => {
    it('should create a usage record with computed cost', async () => {
      mockPrisma.aiUsageRecord.create.mockResolvedValue({});
      await service.recordUsage({
        clinicId,
        type: 'consultation',
        model: 'gpt-4o',
        promptTokens: 1000,
        completionTokens: 500,
      });
      expect(mockPrisma.aiUsageRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinic_id: clinicId,
            prompt_tokens: 1000,
            completion_tokens: 500,
            total_tokens: 1500,
          }),
        }),
      );
    });

    it('should skip record creation when ClinicAiSettings missing', async () => {
      mockPrisma.clinicAiSettings.findUnique.mockResolvedValueOnce(null);
      await service.recordUsage({ clinicId, type: 'test', model: 'gpt-4o', promptTokens: 0, completionTokens: 0 });
      expect(mockPrisma.aiUsageRecord.create).not.toHaveBeenCalled();
    });
  });

  // ─── setOverageEnabled ───────────────────────────────────────

  describe('setOverageEnabled', () => {
    it('should enable overage', async () => {
      await service.setOverageEnabled(clinicId, true);
      expect(mockPrisma.clinicAiSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { overage_enabled: true } }),
      );
    });

    it('should disable overage', async () => {
      await service.setOverageEnabled(clinicId, false);
      expect(mockPrisma.clinicAiSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { overage_enabled: false } }),
      );
    });
  });

  // ─── createApprovalRequest ───────────────────────────────────

  describe('createApprovalRequest', () => {
    beforeEach(() => {
      mockPrisma.aiQuotaApprovalRequest.findFirst.mockResolvedValue(null);
      mockPrisma.aiQuotaApprovalRequest.create.mockResolvedValue({ id: 'req-1' });
    });

    it('should create an approval request', async () => {
      const result = await service.createApprovalRequest({
        clinicId,
        requestedAmount: 50,
        reason: 'Need more AI calls this month',
      });
      expect(result).toEqual({ id: 'req-1' });
    });

    it('should throw BadRequestException when requestedAmount <= 0', async () => {
      await expect(
        service.createApprovalRequest({ clinicId, requestedAmount: 0, reason: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when pending request already exists', async () => {
      mockPrisma.aiQuotaApprovalRequest.findFirst.mockResolvedValueOnce({ id: 'existing-req' });
      await expect(
        service.createApprovalRequest({ clinicId, requestedAmount: 10, reason: 'again' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── decideApprovalRequest ───────────────────────────────────

  describe('decideApprovalRequest', () => {
    const pendingRequest = {
      id: 'req-1',
      clinic_id: clinicId,
      status: 'pending',
      requested_amount: 50,
      reason: 'Need more',
    };

    beforeEach(() => {
      mockPrisma.aiQuotaApprovalRequest.findUnique.mockResolvedValue(pendingRequest);
      mockPrisma.aiQuotaApprovalRequest.update.mockResolvedValue({ ...pendingRequest, status: 'approved' });
      mockPrisma.clinicAiSettings.update.mockResolvedValue(mockSettings);
    });

    it('should approve and increment approved_extra', async () => {
      await service.decideApprovalRequest({
        requestId: 'req-1',
        superAdminId: 'admin-1',
        status: 'approved',
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should reject without changing approved_extra', async () => {
      await service.decideApprovalRequest({
        requestId: 'req-1',
        superAdminId: 'admin-1',
        status: 'rejected',
      });
      expect(mockPrisma.aiQuotaApprovalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) }),
      );
    });

    it('should throw NotFoundException when request not found', async () => {
      mockPrisma.aiQuotaApprovalRequest.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.decideApprovalRequest({ requestId: 'bad', superAdminId: 'a', status: 'approved' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when request already decided', async () => {
      mockPrisma.aiQuotaApprovalRequest.findUnique.mockResolvedValueOnce({ ...pendingRequest, status: 'approved' });
      await expect(
        service.decideApprovalRequest({ requestId: 'req-1', superAdminId: 'a', status: 'rejected' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── markChargePaid ──────────────────────────────────────────

  describe('markChargePaid', () => {
    const charge = { id: 'charge-1', clinic_id: clinicId, status: 'pending' };

    beforeEach(() => {
      mockPrisma.aiOverageCharge.findUnique.mockResolvedValue(charge);
      mockPrisma.aiOverageCharge.update.mockResolvedValue({ ...charge, status: 'paid' });
    });

    it('should mark charge as paid', async () => {
      await service.markChargePaid({ chargeId: 'charge-1', superAdminId: 'admin-1', paymentReference: 'pay_xyz' });
      expect(mockPrisma.aiOverageCharge.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'paid' }) }),
      );
    });

    it('should throw NotFoundException when charge not found', async () => {
      mockPrisma.aiOverageCharge.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.markChargePaid({ chargeId: 'bad', superAdminId: 'a', paymentReference: 'p' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when charge already paid', async () => {
      mockPrisma.aiOverageCharge.findUnique.mockResolvedValueOnce({ ...charge, status: 'paid' });
      await expect(
        service.markChargePaid({ chargeId: 'charge-1', superAdminId: 'a', paymentReference: 'p' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── waiveCharge ─────────────────────────────────────────────

  describe('waiveCharge', () => {
    it('should waive a pending charge', async () => {
      mockPrisma.aiOverageCharge.findUnique.mockResolvedValue({ id: 'c1', status: 'pending' });
      mockPrisma.aiOverageCharge.update.mockResolvedValue({ id: 'c1', status: 'waived' });
      await service.waiveCharge({ chargeId: 'c1', superAdminId: 'admin-1' });
      expect(mockPrisma.aiOverageCharge.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'waived' }) }),
      );
    });

    it('should throw BadRequestException when charge already waived', async () => {
      mockPrisma.aiOverageCharge.findUnique.mockResolvedValueOnce({ id: 'c1', status: 'waived' });
      await expect(service.waiveCharge({ chargeId: 'c1', superAdminId: 'a' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── settleOldestPendingFromPayment ──────────────────────────

  describe('settleOldestPendingFromPayment', () => {
    it('should settle the oldest pending charge', async () => {
      mockPrisma.aiOverageCharge.findFirst.mockResolvedValueOnce({ id: 'charge-1', status: 'pending' });
      mockPrisma.aiOverageCharge.update.mockResolvedValue({});
      await service.settleOldestPendingFromPayment(clinicId, 'pay_abc');
      expect(mockPrisma.aiOverageCharge.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'paid', payment_reference: 'pay_abc' }) }),
      );
    });

    it('should do nothing when no pending charge exists', async () => {
      mockPrisma.aiOverageCharge.findFirst.mockResolvedValueOnce(null);
      await service.settleOldestPendingFromPayment(clinicId, 'pay_abc');
      expect(mockPrisma.aiOverageCharge.update).not.toHaveBeenCalled();
    });
  });

  // ─── closeEndedCycles ────────────────────────────────────────

  describe('closeEndedCycles', () => {
    it('should close cycles for due clinics and return count', async () => {
      mockPrisma.clinicAiSettings.findMany.mockResolvedValue([{ clinic_id: clinicId }]);
      mockPrisma.aiUsageRecord.aggregate.mockResolvedValue({ _count: 0, _sum: { cost_inr: 0 } });
      mockPrisma.clinicAiSettings.update.mockResolvedValue({});

      const count = await service.closeEndedCycles(new Date());
      expect(count).toBe(1);
    });

    it('should skip failing clinics without throwing', async () => {
      mockPrisma.clinicAiSettings.findMany.mockResolvedValue([{ clinic_id: clinicId }]);
      mockPrisma.clinicAiSettings.findUnique.mockRejectedValueOnce(new Error('DB error'));

      const count = await service.closeEndedCycles(new Date());
      expect(count).toBe(0);
    });

    it('should return 0 when no cycles are due', async () => {
      mockPrisma.clinicAiSettings.findMany.mockResolvedValue([]);
      const count = await service.closeEndedCycles(new Date());
      expect(count).toBe(0);
    });
  });

  // ─── syncCycleWithSubscription ───────────────────────────────

  describe('syncCycleWithSubscription', () => {
    it('should update cycle dates when they differ from subscription period', async () => {
      const newStart = new Date('2026-02-01');
      const newEnd = new Date('2026-03-01');
      await service.syncCycleWithSubscription(clinicId, newStart, newEnd);
      expect(mockPrisma.clinicAiSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { current_cycle_start: newStart, current_cycle_end: newEnd },
        }),
      );
    });

    it('should not update when dates already match', async () => {
      // mockSettings has cycleStart/cycleEnd already set
      await service.syncCycleWithSubscription(clinicId, cycleStart, cycleEnd);
      expect(mockPrisma.clinicAiSettings.update).not.toHaveBeenCalled();
    });
  });
});
