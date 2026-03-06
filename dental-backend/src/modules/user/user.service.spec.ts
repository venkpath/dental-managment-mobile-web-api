import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserService } from './user.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { UserRole } from './dto/index.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
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

const mockPasswordService = {
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  verify: jest.fn().mockResolvedValue(true),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PasswordService, useValue: mockPasswordService },
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
    it('should create a user with clinicId from header', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null); // email check

      const result = await service.create(clinicId, {
        branch_id: branchId,
        name: 'Dr. Jane Smith',
        email: 'jane@clinic.com',
        password: 'StrongP@ss1',
        role: UserRole.DENTIST,
      });
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clinic_id: clinicId }),
        }),
      );
    });

    it('should throw NotFoundException if clinic missing', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create('bad', {
          name: 'X', email: 'x@x.com',
          password: '12345678', role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if branch not in clinic', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: 'other-clinic' });
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create(clinicId, {
          branch_id: branchId, name: 'X', email: 'x@x.com',
          password: '12345678', role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate email in clinic', async () => {
      mockPrismaService.user.findUnique.mockReset();
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.create(clinicId, {
          name: 'X', email: 'jane@clinic.com',
          password: '12345678', role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return users filtered by clinicId', async () => {
      const result = await service.findAll(clinicId);
      expect(result).toEqual([mockUser]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clinic_id: clinicId } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user within the same clinic', async () => {
      const result = await service.findOne(clinicId, mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user belongs to different clinic', async () => {
      await expect(service.findOne(otherClinicId, mockUser.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user within the same clinic', async () => {
      const result = await service.update(clinicId, mockUser.id, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when updating user from different clinic', async () => {
      await expect(
        service.update(otherClinicId, mockUser.id, { name: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
