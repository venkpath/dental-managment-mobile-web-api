import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminService } from './super-admin.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { EmailProvider } from '../communication/providers/email.provider.js';

const mockSuperAdmin = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'admin@dental-saas.com',
  password_hash: '$2b$12$hashedpassword',
  name: 'Platform Admin',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockPrismaService = {
  superAdmin: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockPasswordService = {
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
};

const mockEmailProvider = {
  isConfigured: jest.fn().mockReturnValue(true),
  configure: jest.fn(),
  send: jest.fn().mockResolvedValue({ success: true }),
};

const mockConfigService = {
  get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
};

describe('SuperAdminService', () => {
  let service: SuperAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: EmailProvider, useValue: mockEmailProvider },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a super admin and exclude password_hash', async () => {
      mockPrismaService.superAdmin.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.superAdmin.create.mockResolvedValueOnce(mockSuperAdmin);

      const result = await service.create({
        name: 'Platform Admin',
        email: 'admin@dental-saas.com',
        password: 'StrongP@ss1',
      });

      expect(result).not.toHaveProperty('password_hash');
      expect(result.email).toBe('admin@dental-saas.com');
      expect(mockPasswordService.hash).toHaveBeenCalledWith('StrongP@ss1');
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.superAdmin.findUnique.mockResolvedValueOnce(mockSuperAdmin);

      await expect(
        service.create({
          name: 'Admin',
          email: 'admin@dental-saas.com',
          password: 'StrongP@ss1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('should return super admin by email', async () => {
      mockPrismaService.superAdmin.findUnique.mockResolvedValueOnce(mockSuperAdmin);

      const result = await service.findByEmail('admin@dental-saas.com');

      expect(result).toEqual(mockSuperAdmin);
    });

    it('should return null when not found', async () => {
      mockPrismaService.superAdmin.findUnique.mockResolvedValueOnce(null);

      const result = await service.findByEmail('unknown@email.com');

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return super admin by id without password_hash', async () => {
      mockPrismaService.superAdmin.findUnique.mockResolvedValueOnce(mockSuperAdmin);

      const result = await service.findOne(mockSuperAdmin.id);

      expect(result).not.toHaveProperty('password_hash');
      expect(result.email).toBe('admin@dental-saas.com');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.superAdmin.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
