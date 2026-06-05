import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminService } from './super-admin.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { WhatsAppProvider } from '../communication/providers/whatsapp.provider.js';
import { AutomationService } from '../automation/automation.service.js';

const mockSuperAdmin = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'admin@dental-saas.com',
  password_hash: '$2b$12$hashedpassword',
  name: 'Platform Admin',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
};

const clinicId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const freePlanId = 'plan-free-0000-1111-2222-333333333333';
const branchId = 'branch-1111-2222-3333-444444444444';

const mockListingClinic = {
  id: clinicId,
  name: 'Sharma Dental',
  email: 'dr@sharma.com',
  phone: '9876543210',
  address: '12 MG Road',
  directory_contact_name: 'Dr Sharma',
  directory_approval_status: 'pending',
};

const mockPrismaService = {
  superAdmin: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  clinic: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  plan: {
    findFirst: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  branch: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
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

const mockWhatsAppProvider = { isConfigured: jest.fn(), configure: jest.fn(), send: jest.fn() };
const mockAutomationService = { seedClinicAutomationDefaults: jest.fn().mockResolvedValue(undefined) };

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
        { provide: WhatsAppProvider, useValue: mockWhatsAppProvider },
        { provide: AutomationService, useValue: mockAutomationService },
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

  describe('approveDirectoryListing', () => {
    it('should provision Free plan, SuperAdmin user, and branch on approval', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(mockListingClinic);
      mockPrismaService.plan.findFirst.mockResolvedValueOnce({ id: freePlanId, name: 'Free' });
      mockPrismaService.user.findFirst.mockResolvedValueOnce(null);

      const txBranch = { id: branchId, clinic_id: clinicId, name: 'Main Branch' };
      mockPrismaService.$transaction.mockImplementation(async (fn: (tx: typeof mockPrismaService) => Promise<unknown>) => {
        const tx = {
          branch: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(txBranch),
          },
          user: { create: jest.fn().mockResolvedValue({}) },
          clinic: { update: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx as never);
      });

      const result = await service.approveDirectoryListing(clinicId);

      expect(result).toEqual({ approved: true, clinic_name: 'Sharma Dental', plan: 'Free' });
      expect(mockPasswordService.hash).toHaveBeenCalled();
      expect(mockAutomationService.seedClinicAutomationDefaults).toHaveBeenCalledWith(clinicId);
    });

    it('should throw when Free plan is missing', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(mockListingClinic);
      mockPrismaService.plan.findFirst.mockResolvedValueOnce(null);

      await expect(service.approveDirectoryListing(clinicId)).rejects.toThrow(BadRequestException);
    });

    it('should throw when clinic is not pending', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce({
        ...mockListingClinic,
        directory_approval_status: 'approved',
      });

      await expect(service.approveDirectoryListing(clinicId)).rejects.toThrow(BadRequestException);
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
