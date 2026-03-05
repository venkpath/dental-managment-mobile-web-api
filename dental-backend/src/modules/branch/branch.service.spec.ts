import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BranchService } from './branch.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';

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
    findUnique: jest.fn().mockResolvedValue({ id: clinicId, name: 'Test Clinic' }),
  },
  branch: {
    create: jest.fn().mockResolvedValue(mockBranch),
    findMany: jest.fn().mockResolvedValue([mockBranch]),
    findUnique: jest.fn().mockResolvedValue(mockBranch),
    update: jest.fn().mockResolvedValue({ ...mockBranch, name: 'Updated Branch' }),
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
    mockPrismaService.clinic.findUnique.mockResolvedValue({ id: clinicId, name: 'Test Clinic' });
    mockPrismaService.branch.findUnique.mockResolvedValue(mockBranch);
    mockPrismaService.branch.create.mockResolvedValue(mockBranch);
    mockPrismaService.branch.update.mockResolvedValue({ ...mockBranch, name: 'Updated Branch' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a branch', async () => {
      const result = await service.create({
        clinic_id: clinicId,
        name: 'Downtown Branch',
      });
      expect(result).toEqual(mockBranch);
      expect(mockPrismaService.clinic.findUnique).toHaveBeenCalledWith({
        where: { id: clinicId },
      });
    });

    it('should throw NotFoundException if clinic does not exist', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create({ clinic_id: 'non-existent', name: 'Branch' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return branches with clinic info', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockBranch]);
    });
  });

  describe('findOne', () => {
    it('should return a branch by id', async () => {
      const result = await service.findOne(mockBranch.id);
      expect(result).toEqual(mockBranch);
    });

    it('should throw NotFoundException when branch not found', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a branch', async () => {
      const result = await service.update(mockBranch.id, { name: 'Updated Branch' });
      expect(result.name).toBe('Updated Branch');
    });
  });
});
