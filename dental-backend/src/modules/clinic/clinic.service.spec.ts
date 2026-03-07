import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClinicService } from './clinic.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const mockClinic = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Clinic',
  email: 'test@clinic.com',
  phone: '+1-555-000-0000',
  address: '123 Test St',
  city: 'TestCity',
  state: 'TS',
  country: 'US',
  plan_id: null,
  subscription_status: 'trial',
  trial_ends_at: null,
  ai_usage_count: 0,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockPrismaService = {
  clinic: {
    create: jest.fn().mockResolvedValue(mockClinic),
    findMany: jest.fn().mockResolvedValue([mockClinic]),
    findUnique: jest.fn().mockResolvedValue(mockClinic),
    update: jest.fn().mockResolvedValue({ ...mockClinic, name: 'Updated Clinic' }),
  },
};

describe('ClinicService', () => {
  let service: ClinicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ClinicService>(ClinicService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a clinic with 14-day trial', async () => {
      mockPrismaService.clinic.create.mockResolvedValueOnce(mockClinic);
      const result = await service.create({
        name: 'Test Clinic',
        email: 'test@clinic.com',
      });
      expect(result).toEqual(mockClinic);
      expect(mockPrismaService.clinic.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Clinic',
          email: 'test@clinic.com',
          trial_ends_at: expect.any(Date),
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of clinics', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockClinic]);
    });
  });

  describe('findOne', () => {
    it('should return a clinic by id', async () => {
      const result = await service.findOne(mockClinic.id);
      expect(result).toEqual(mockClinic);
    });

    it('should throw NotFoundException when clinic not found', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a clinic', async () => {
      const result = await service.update(mockClinic.id, { name: 'Updated Clinic' });
      expect(result.name).toBe('Updated Clinic');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription fields', async () => {
      const planId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
      const updated = { ...mockClinic, plan_id: planId, subscription_status: 'active' };
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(mockClinic);
      mockPrismaService.clinic.update.mockResolvedValueOnce(updated);

      const result = await service.updateSubscription(mockClinic.id, {
        plan_id: planId,
        subscription_status: 'active' as any,
      });

      expect(result.plan_id).toBe(planId);
      expect(mockPrismaService.clinic.update).toHaveBeenCalledWith({
        where: { id: mockClinic.id },
        data: expect.objectContaining({ plan_id: planId, subscription_status: 'active' }),
        include: { plan: true },
      });
    });

    it('should convert trial_ends_at string to Date', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(mockClinic);
      mockPrismaService.clinic.update.mockResolvedValueOnce(mockClinic);

      await service.updateSubscription(mockClinic.id, {
        trial_ends_at: '2026-04-06T00:00:00.000Z',
      });

      expect(mockPrismaService.clinic.update).toHaveBeenCalledWith({
        where: { id: mockClinic.id },
        data: expect.objectContaining({
          trial_ends_at: expect.any(Date),
        }),
        include: { plan: true },
      });
    });

    it('should throw NotFoundException when clinic not found', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.updateSubscription('non-existent-id', { subscription_status: 'active' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
