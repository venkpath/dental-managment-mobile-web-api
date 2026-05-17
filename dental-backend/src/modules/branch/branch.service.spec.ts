import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BranchService } from './branch.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const mockBranch = {
  id: 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee',
  clinic_id: clinicId,
  name: 'Downtown Branch',
  phone: '+1-555-100-2000',
  address: '456 Oak Ave',
  city: 'Los Angeles',
  state: 'CA',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockPrismaService = {
  clinic: {
    findUnique: jest.fn(),
  },
  branch: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('BranchService', () => {
  let service: BranchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
    jest.clearAllMocks();
    // Default: unlimited plan (max_branches = null) — no override set.
    mockPrismaService.clinic.findUnique.mockResolvedValue({ id: clinicId, custom_max_branches: null, plan: { max_branches: null } });
    mockPrismaService.branch.count.mockResolvedValue(0);
    mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
    mockPrismaService.branch.findMany.mockResolvedValue([mockBranch]);
    mockPrismaService.branch.create.mockResolvedValue(mockBranch);
    mockPrismaService.branch.update.mockResolvedValue({ ...mockBranch, name: 'Updated Branch' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a branch when plan limit is not set (unlimited)', async () => {
      const result = await service.create(clinicId, { name: 'Downtown Branch' });
      expect(result).toEqual(mockBranch);
      expect(mockPrismaService.branch.create).toHaveBeenCalledWith({
        data: { name: 'Downtown Branch', clinic_id: clinicId },
      });
    });

    it('should create a branch when under the plan limit', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ id: clinicId, custom_max_branches: null, plan: { max_branches: 2 } });
      mockPrismaService.branch.count.mockResolvedValueOnce(1);
      const result = await service.create(clinicId, { name: 'Branch 2' });
      expect(result).toEqual(mockBranch);
    });

    it('should block creation when at the plan limit', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ id: clinicId, custom_max_branches: null, plan: { max_branches: 1 } });
      mockPrismaService.branch.count.mockResolvedValueOnce(1);
      await expect(service.create(clinicId, { name: 'Branch 2' })).rejects.toThrow(ForbiddenException);
    });

    it('should allow creation when custom override raises the limit', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ id: clinicId, custom_max_branches: 2, plan: { max_branches: 1 } });
      mockPrismaService.branch.count.mockResolvedValueOnce(1);
      const result = await service.create(clinicId, { name: 'Extra Branch' });
      expect(result).toEqual(mockBranch);
    });

    it('should block creation when at the custom override limit', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce({ id: clinicId, custom_max_branches: 2, plan: { max_branches: 1 } });
      mockPrismaService.branch.count.mockResolvedValueOnce(2);
      await expect(service.create(clinicId, { name: 'Too Many' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if clinic does not exist', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create('non-existent', { name: 'Branch' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return branches filtered by clinicId', async () => {
      const result = await service.findAll(clinicId);
      expect(result).toEqual([mockBranch]);
      expect(mockPrismaService.branch.findMany).toHaveBeenCalledWith({
        where: { clinic_id: clinicId },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a branch when it belongs to the clinic', async () => {
      const result = await service.findOne(clinicId, mockBranch.id);
      expect(result).toEqual(mockBranch);
    });

    it('should throw NotFoundException when branch not found', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when branch belongs to different clinic', async () => {
      await expect(service.findOne(otherClinicId, mockBranch.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a branch within the same clinic', async () => {
      const result = await service.update(clinicId, mockBranch.id, { name: 'Updated Branch' });
      expect(result.name).toBe('Updated Branch');
    });

    it('should throw NotFoundException when updating branch from different clinic', async () => {
      await expect(
        service.update(otherClinicId, mockBranch.id, { name: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
