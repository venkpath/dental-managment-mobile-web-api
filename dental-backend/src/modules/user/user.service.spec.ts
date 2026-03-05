import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserService } from './user.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { UserRole } from './dto/index.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';

const mockUser = {
  id: 'fff00000-1111-2222-3333-444444444444',
  clinic_id: clinicId,
  branch_id: branchId,
  name: 'Dr. Jane Smith',
  email: 'jane@clinic.com',
  role: 'Dentist',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockPrismaService = {
  clinic: { findUnique: jest.fn() },
  branch: { findUnique: jest.fn() },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();

    mockPrismaService.clinic.findUnique.mockResolvedValue({ id: clinicId });
    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
    mockPrismaService.user.create.mockResolvedValue(mockUser);
    mockPrismaService.user.update.mockResolvedValue({ ...mockUser, name: 'Updated' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValue(mockUser);

      const result = await service.create({
        clinic_id: clinicId,
        branch_id: branchId,
        name: 'Dr. Jane Smith',
        email: 'jane@clinic.com',
        password: 'StrongP@ss1',
        role: UserRole.DENTIST,
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if clinic missing', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create({
          clinic_id: 'bad', name: 'X', email: 'x@x.com',
          password: '12345678', role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if branch not in clinic', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: 'other-clinic' });
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create({
          clinic_id: clinicId, branch_id: branchId, name: 'X', email: 'x@x.com',
          password: '12345678', role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate email in clinic', async () => {
      // Reset and explicitly set: email check returns existing user
      mockPrismaService.user.findUnique.mockReset();
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.create({
          clinic_id: clinicId, name: 'X', email: 'jane@clinic.com',
          password: '12345678', role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return users', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockUser]);
    });

    it('should filter by clinic_id', async () => {
      await service.findAll(clinicId);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clinic_id: clinicId } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user', async () => {
      const result = await service.findOne(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const result = await service.update(mockUser.id, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });
});
