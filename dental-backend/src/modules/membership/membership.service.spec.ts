import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { MembershipService } from './membership.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = 'clinic-uuid-0001';
const branchId = 'branch-uuid-0001';
const planId = 'plan-uuid-0001';
const enrollId = 'enroll-uuid-0001';
const patientId = 'patient-uuid-0001';

const mockBenefit = {
  id: 'benefit-1',
  title: 'Free Cleaning',
  description: 'Once a year',
  benefit_type: 'service',
  treatment_label: 'Cleaning',
  coverage_scope: 'shared',
  included_quantity: 2,
  discount_percentage: null,
  discount_amount: null,
  credit_amount: null,
  display_order: 0,
  is_active: true,
};

const mockPlan = {
  id: planId,
  clinic_id: clinicId,
  name: 'Gold Plan',
  code: 'GOLD',
  price: 12000,
  duration_months: 12,
  covered_members_limit: 2,
  grace_period_days: 0,
  is_active: true,
  benefits: [mockBenefit],
  _count: { enrollments: 0 },
};

const mockEnrollment = {
  id: enrollId,
  clinic_id: clinicId,
  branch_id: branchId,
  membership_plan_id: planId,
  primary_patient_id: patientId,
  enrollment_number: 'MEM-20260101-1234',
  start_date: new Date('2026-01-01'),
  end_date: new Date('2027-01-01'),
  amount_paid: 12000,
  status: 'active',
  notes: null,
  membership_plan: mockPlan,
  primary_patient: { id: patientId, first_name: 'John', last_name: 'Doe', clinic_id: clinicId },
  branch: { id: branchId, name: 'Main Branch' },
  members: [{ id: 'm1', patient_id: patientId, relation_label: 'Self', is_primary: true, patient: {} }],
  usages: [],
};

const mockPrisma = {
  membershipPlan: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  membershipEnrollment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  membershipBenefit: { deleteMany: jest.fn() },
  membershipBenefitUsage: {
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  branch: { findUnique: jest.fn() },
  patient: { findUnique: jest.fn(), findMany: jest.fn() },
  treatment: { findUnique: jest.fn() },
  invoice: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

describe('MembershipService', () => {
  let service: MembershipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    mockPrisma.membershipPlan.create.mockResolvedValue(mockPlan);
    mockPrisma.membershipPlan.findMany.mockResolvedValue([mockPlan]);
    mockPrisma.membershipPlan.findUnique.mockResolvedValue(mockPlan);
    mockPrisma.membershipPlan.findFirst.mockResolvedValue(null); // no conflict by default
    mockPrisma.membershipPlan.update.mockResolvedValue(mockPlan);
    mockPrisma.membershipEnrollment.create.mockResolvedValue(mockEnrollment);
    mockPrisma.membershipEnrollment.findMany.mockResolvedValue([mockEnrollment]);
    mockPrisma.membershipEnrollment.findUnique.mockResolvedValue(mockEnrollment);
    mockPrisma.membershipEnrollment.update.mockResolvedValue(mockEnrollment);
    mockPrisma.membershipBenefit.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.membershipBenefitUsage.aggregate.mockResolvedValue({ _sum: { quantity_used: 0 } });
    mockPrisma.membershipBenefitUsage.create.mockResolvedValue({});
    mockPrisma.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrisma.patient.findUnique.mockResolvedValue({ id: patientId, clinic_id: clinicId, branch_id: branchId });
    mockPrisma.patient.findMany.mockResolvedValue([{ id: patientId }]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createPlan ───────────────────────────────────────────────

  describe('createPlan', () => {
    const dto = {
      name: 'Gold Plan',
      code: 'GOLD',
      price: 12000,
      duration_months: 12,
      covered_members_limit: 2,
      benefits: [{ title: 'Free Cleaning', benefit_type: 'service', estimated_cost: 0 }],
    };

    it('should create a membership plan', async () => {
      const result = await service.createPlan(clinicId, dto as any);
      expect(result).toEqual(mockPlan);
    });

    it('should throw ConflictException when plan name already exists', async () => {
      mockPrisma.membershipPlan.findFirst.mockResolvedValueOnce({ id: 'other', name: 'Gold Plan' });
      await expect(service.createPlan(clinicId, dto as any)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when plan code already exists', async () => {
      mockPrisma.membershipPlan.findFirst
        .mockResolvedValueOnce(null) // name check passes
        .mockResolvedValueOnce({ id: 'other', code: 'GOLD' }); // code check fails
      await expect(service.createPlan(clinicId, dto as any)).rejects.toThrow(ConflictException);
    });
  });

  // ─── findAllPlans ────────────────────────────────────────────

  describe('findAllPlans', () => {
    it('should return all plans for the clinic', async () => {
      const result = await service.findAllPlans(clinicId);
      expect(result).toEqual([mockPlan]);
    });
  });

  // ─── updatePlan ──────────────────────────────────────────────

  describe('updatePlan', () => {
    it('should update a plan', async () => {
      const result = await service.updatePlan(clinicId, planId, { name: 'Platinum Plan' } as any);
      expect(result).toEqual(mockPlan);
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockPrisma.membershipPlan.findUnique.mockResolvedValueOnce(null);
      await expect(service.updatePlan(clinicId, planId, {})).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createEnrollment ────────────────────────────────────────

  describe('createEnrollment', () => {
    const dto = {
      branch_id: branchId,
      membership_plan_id: planId,
      primary_patient_id: patientId,
      start_date: '2026-01-01',
      amount_paid: 12000,
    };

    it('should create an enrollment', async () => {
      const result = await service.createEnrollment(clinicId, dto as any);
      expect(result).toEqual(mockEnrollment);
    });

    it('should throw NotFoundException when branch not in clinic', async () => {
      mockPrisma.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: 'other' });
      await expect(service.createEnrollment(clinicId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when plan not in clinic', async () => {
      mockPrisma.membershipPlan.findUnique.mockResolvedValueOnce({ ...mockPlan, clinic_id: 'other' });
      await expect(service.createEnrollment(clinicId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when plan is inactive', async () => {
      mockPrisma.membershipPlan.findUnique.mockResolvedValueOnce({ ...mockPlan, is_active: false });
      await expect(service.createEnrollment(clinicId, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when too many members for plan limit', async () => {
      const dtoWithMembers = {
        ...dto,
        members: [
          { patient_id: 'p2', relation_label: 'Spouse' },
          { patient_id: 'p3', relation_label: 'Child' },
        ],
      };
      // covered_members_limit = 2, but primary + 2 members = 3 total
      mockPrisma.patient.findMany.mockResolvedValueOnce([{ id: patientId }, { id: 'p2' }, { id: 'p3' }]);
      await expect(service.createEnrollment(clinicId, dtoWithMembers as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateEnrollment ────────────────────────────────────────

  describe('updateEnrollment', () => {
    it('should update enrollment status', async () => {
      const result = await service.updateEnrollment(clinicId, enrollId, { status: 'cancelled' } as any);
      expect(result).toEqual(mockEnrollment);
    });

    it('should throw BadRequestException when end_date <= start_date', async () => {
      await expect(
        service.updateEnrollment(clinicId, enrollId, { start_date: '2027-06-01', end_date: '2027-01-01' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── recordUsage ─────────────────────────────────────────────

  describe('recordUsage', () => {
    const dto = {
      patient_id: patientId,
      membership_benefit_id: 'benefit-1',
      quantity_used: 1,
    };

    it('should record benefit usage', async () => {
      const result = await service.recordUsage(clinicId, enrollId, dto as any);
      expect(mockPrisma.membershipBenefitUsage.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when patient not a member', async () => {
      await expect(
        service.recordUsage(clinicId, enrollId, { ...dto, patient_id: 'non-member' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when benefit not in plan', async () => {
      await expect(
        service.recordUsage(clinicId, enrollId, { ...dto, membership_benefit_id: 'bad-benefit' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when usage exceeds remaining quantity', async () => {
      // used_quantity = 2 (limit), requesting 1 more = no remaining
      mockPrisma.membershipBenefitUsage.aggregate.mockResolvedValueOnce({ _sum: { quantity_used: 2 } });
      await expect(service.recordUsage(clinicId, enrollId, { ...dto, quantity_used: 1 } as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getPatientSummary ───────────────────────────────────────

  describe('getPatientSummary', () => {
    it('should return patient summary with active and past enrollments', async () => {
      const result = await service.getPatientSummary(clinicId, patientId);
      expect(result).toHaveProperty('patient');
      expect(result).toHaveProperty('active_enrollments');
      expect(result).toHaveProperty('past_enrollments');
    });

    it('should throw NotFoundException when patient not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValueOnce(null);
      await expect(service.getPatientSummary(clinicId, patientId)).rejects.toThrow(NotFoundException);
    });
  });
});
