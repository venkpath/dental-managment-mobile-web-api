import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlanService } from './plan.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const mockPlan = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Basic',
  price_monthly: 49.99,
  max_branches: 3,
  max_staff: 10,
  ai_quota: 100,
  created_at: new Date(),
  updated_at: new Date(),
};

const featureId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';

const mockPlanFeature = {
  id: 'fff00000-1111-2222-3333-444444444444',
  plan_id: mockPlan.id,
  feature_id: featureId,
  is_enabled: true,
};

const mockPrismaService = {
  plan: {
    create: jest.fn().mockResolvedValue(mockPlan),
    findMany: jest.fn().mockResolvedValue([mockPlan]),
    findUnique: jest.fn().mockResolvedValue(mockPlan),
    update: jest.fn().mockResolvedValue({ ...mockPlan, name: 'Premium' }),
  },
  feature: {
    findMany: jest.fn(),
  },
  planFeature: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('PlanService', () => {
  let service: PlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PlanService>(PlanService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a plan', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.plan.create.mockResolvedValueOnce(mockPlan);
      const result = await service.create({
        name: 'Basic',
        price_monthly: 49.99,
        max_branches: 3,
        max_staff: 10,
        ai_quota: 100,
      });
      expect(result).toEqual(mockPlan);
      expect(mockPrismaService.plan.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when plan name already exists', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(mockPlan);
      await expect(
        service.create({
          name: 'Basic',
          price_monthly: 49.99,
          max_branches: 3,
          max_staff: 10,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return an array of plans', async () => {
      mockPrismaService.plan.findMany.mockResolvedValueOnce([mockPlan]);
      const result = await service.findAll();
      expect(result).toEqual([mockPlan]);
    });
  });

  describe('findOne', () => {
    it('should return a plan by id', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(mockPlan);
      const result = await service.findOne(mockPlan.id);
      expect(result).toEqual(mockPlan);
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a plan', async () => {
      mockPrismaService.plan.findUnique
        .mockResolvedValueOnce(mockPlan)  // findOne check
        .mockResolvedValueOnce(null);     // name uniqueness check
      mockPrismaService.plan.update.mockResolvedValueOnce({ ...mockPlan, name: 'Premium' });
      const result = await service.update(mockPlan.id, { name: 'Premium' });
      expect(result.name).toBe('Premium');
    });

    it('should throw NotFoundException when updating non-existent plan', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.update('non-existent-id', { name: 'Premium' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing plan name', async () => {
      const otherPlan = { ...mockPlan, id: 'other-id', name: 'Premium' };
      mockPrismaService.plan.findUnique
        .mockResolvedValueOnce(mockPlan)    // findOne check
        .mockResolvedValueOnce(otherPlan);  // name uniqueness check (different id)
      await expect(
        service.update(mockPlan.id, { name: 'Premium' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('assignFeatures', () => {
    it('should assign features to a plan', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(mockPlan);
      mockPrismaService.feature.findMany.mockResolvedValueOnce([{ id: featureId }]);
      mockPrismaService.planFeature.upsert.mockResolvedValueOnce(mockPlanFeature);

      const result = await service.assignFeatures(mockPlan.id, {
        features: [{ feature_id: featureId, is_enabled: true }],
      });

      expect(result).toEqual([mockPlanFeature]);
      expect(mockPrismaService.planFeature.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.assignFeatures('non-existent', {
          features: [{ feature_id: featureId }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when feature not found', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(mockPlan);
      mockPrismaService.feature.findMany.mockResolvedValueOnce([]);

      await expect(
        service.assignFeatures(mockPlan.id, {
          features: [{ feature_id: featureId }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFeatures', () => {
    it('should return plan features with feature details', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(mockPlan);
      mockPrismaService.planFeature.findMany.mockResolvedValueOnce([mockPlanFeature]);

      const result = await service.getFeatures(mockPlan.id);

      expect(result).toEqual([mockPlanFeature]);
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValueOnce(null);

      await expect(service.getFeatures('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
