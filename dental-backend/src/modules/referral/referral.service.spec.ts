import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ReferralService } from './referral.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';

const clinicId = 'clinic-uuid-0001';
const patientId = 'patient-uuid-0001';
const referredPatientId = 'patient-uuid-0002';
const codeId = 'code-uuid-0001';
const referralId = 'referral-uuid-0001';

const mockCode = {
  id: codeId,
  clinic_id: clinicId,
  patient_id: patientId,
  code: 'ABCD1234',
  is_active: true,
  patient: { id: patientId, first_name: 'John', last_name: 'Doe', phone: '9999999999' },
};

const mockReferral = {
  id: referralId,
  clinic_id: clinicId,
  referrer_patient_id: patientId,
  referred_patient_id: referredPatientId,
  referral_code_id: codeId,
  status: 'completed',
  reward_type: 'discount_percentage',
  reward_value: 10,
  reward_status: 'pending',
  referrer: { id: patientId, first_name: 'John', last_name: 'Doe' },
  referred: { id: referredPatientId, first_name: 'Jane', last_name: 'Doe' },
};

const mockPrisma = {
  patientReferralCode: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  referral: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  clinic: { findUnique: jest.fn() },
  patient: { findMany: jest.fn() },
  invoice: { aggregate: jest.fn() },
  $queryRaw: jest.fn(),
};

const mockCommunicationService = { sendMessage: jest.fn() };

describe('ReferralService', () => {
  let service: ReferralService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommunicationService, useValue: mockCommunicationService },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    jest.clearAllMocks();

    mockPrisma.patientReferralCode.findFirst.mockResolvedValue(null);
    mockPrisma.patientReferralCode.create.mockResolvedValue(mockCode);
    mockPrisma.patientReferralCode.findUnique.mockResolvedValue(mockCode);
    mockPrisma.patientReferralCode.update.mockResolvedValue({ ...mockCode, is_active: false });
    mockPrisma.referral.create.mockResolvedValue(mockReferral);
    mockPrisma.referral.findFirst.mockResolvedValue(null); // no existing referral
    mockPrisma.referral.findMany.mockResolvedValue([mockReferral]);
    mockPrisma.referral.update.mockResolvedValue({ ...mockReferral, reward_status: 'credited' });
    mockPrisma.referral.count.mockResolvedValue(5);
    mockPrisma.referral.groupBy.mockResolvedValue([{ referrer_patient_id: patientId, _count: { id: 3 }, _sum: { reward_value: 30 } }]);
    mockPrisma.clinic.findUnique.mockResolvedValue({ name: 'Test Clinic' });
    mockPrisma.patient.findMany.mockResolvedValue([{ id: patientId, first_name: 'John', last_name: 'Doe', phone: '9999999999' }]);
    mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { net_amount: 50000 } });
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockCommunicationService.sendMessage.mockResolvedValue({ status: 'queued' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getOrCreateReferralCode ─────────────────────────────────

  describe('getOrCreateReferralCode', () => {
    it('should return existing active code without creating a new one', async () => {
      mockPrisma.patientReferralCode.findFirst.mockResolvedValueOnce(mockCode);
      const result = await service.getOrCreateReferralCode(clinicId, patientId);
      expect(result).toEqual(mockCode);
      expect(mockPrisma.patientReferralCode.create).not.toHaveBeenCalled();
    });

    it('should create a new code when none exists', async () => {
      const result = await service.getOrCreateReferralCode(clinicId, patientId);
      expect(mockPrisma.patientReferralCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clinic_id: clinicId, patient_id: patientId }),
        }),
      );
      expect(result).toEqual(mockCode);
    });

    it('should generate an 8-character alphanumeric code', async () => {
      let capturedCode = '';
      mockPrisma.patientReferralCode.create.mockImplementationOnce(({ data }: any) => {
        capturedCode = data.code;
        return Promise.resolve(mockCode);
      });
      await service.getOrCreateReferralCode(clinicId, patientId);
      expect(capturedCode).toMatch(/^[A-F0-9]{8}$/);
    });
  });

  // ─── deactivateCode ──────────────────────────────────────────

  describe('deactivateCode', () => {
    it('should deactivate a code belonging to the clinic', async () => {
      mockPrisma.patientReferralCode.findFirst.mockResolvedValueOnce(mockCode);
      const result = await service.deactivateCode(clinicId, codeId);
      expect(result.is_active).toBe(false);
    });

    it('should throw NotFoundException when code not found', async () => {
      mockPrisma.patientReferralCode.findFirst.mockResolvedValueOnce(null);
      await expect(service.deactivateCode(clinicId, codeId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── completeReferral ────────────────────────────────────────

  describe('completeReferral', () => {
    const dto = { referral_code: 'ABCD1234', referred_patient_id: referredPatientId };

    it('should create a referral and notify the referrer', async () => {
      mockPrisma.patientReferralCode.findUnique.mockResolvedValueOnce(mockCode);
      const result = await service.completeReferral(clinicId, dto);
      expect(result).toEqual(mockReferral);
      expect(mockCommunicationService.sendMessage).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid or inactive code', async () => {
      mockPrisma.patientReferralCode.findUnique.mockResolvedValueOnce(null);
      await expect(service.completeReferral(clinicId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for inactive code', async () => {
      mockPrisma.patientReferralCode.findUnique.mockResolvedValueOnce({ ...mockCode, is_active: false });
      await expect(service.completeReferral(clinicId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on self-referral', async () => {
      mockPrisma.patientReferralCode.findUnique.mockResolvedValueOnce(mockCode);
      await expect(
        service.completeReferral(clinicId, { ...dto, referred_patient_id: patientId }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when patient already referred', async () => {
      mockPrisma.patientReferralCode.findUnique.mockResolvedValueOnce(mockCode);
      mockPrisma.referral.findFirst.mockResolvedValueOnce({ id: 'existing' });
      await expect(service.completeReferral(clinicId, dto)).rejects.toThrow(ConflictException);
    });

    it('should not throw when referral notification fails', async () => {
      mockPrisma.patientReferralCode.findUnique.mockResolvedValueOnce(mockCode);
      mockCommunicationService.sendMessage.mockRejectedValueOnce(new Error('WA error'));
      await expect(service.completeReferral(clinicId, dto)).resolves.toBeDefined();
    });
  });

  // ─── creditReward ────────────────────────────────────────────

  describe('creditReward', () => {
    it('should mark reward as credited', async () => {
      mockPrisma.referral.findFirst.mockResolvedValueOnce(mockReferral);
      const result = await service.creditReward(clinicId, referralId);
      expect(mockPrisma.referral.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { reward_status: 'credited' } }),
      );
    });

    it('should throw NotFoundException when referral not found', async () => {
      mockPrisma.referral.findFirst.mockResolvedValueOnce(null);
      await expect(service.creditReward(clinicId, referralId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getStats ────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return referral statistics', async () => {
      const result = await service.getStats(clinicId);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('rewarded');
      expect(result).toHaveProperty('pending_rewards');
    });
  });

  // ─── getLeaderboard ──────────────────────────────────────────

  describe('getLeaderboard', () => {
    it('should return top referrers with patient details', async () => {
      const result = await service.getLeaderboard(clinicId, 10);
      expect(result).toHaveLength(1);
      expect(result[0].referral_count).toBe(3);
      expect(result[0].patient).toBeDefined();
    });
  });

  // ─── getDetailedAnalytics ────────────────────────────────────

  describe('getDetailedAnalytics', () => {
    it('should return analytics with conversion rate and top referrers', async () => {
      mockPrisma.referral.findMany.mockResolvedValueOnce([{ referred_patient_id: referredPatientId }]);
      const result = await service.getDetailedAnalytics(clinicId);
      expect(result.summary).toHaveProperty('conversion_rate');
      expect(result.summary).toHaveProperty('attributed_revenue');
      expect(result.top_referrers).toHaveLength(1);
    });

    it('should filter by date range when provided', async () => {
      mockPrisma.referral.findMany.mockResolvedValueOnce([]);
      await service.getDetailedAnalytics(clinicId, '2026-01-01', '2026-12-31');
      expect(mockPrisma.referral.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ created_at: expect.any(Object) }) }),
      );
    });
  });

  // ─── getPatientReferrals ─────────────────────────────────────

  describe('getPatientReferrals', () => {
    it('should return referrals for a patient', async () => {
      const result = await service.getPatientReferrals(clinicId, patientId);
      expect(result).toEqual([mockReferral]);
      expect(mockPrisma.referral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ referrer_patient_id: patientId }) }),
      );
    });
  });
});
