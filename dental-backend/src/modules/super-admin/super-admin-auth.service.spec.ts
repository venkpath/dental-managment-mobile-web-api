import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SuperAdminAuthService } from './super-admin-auth.service.js';
import { SuperAdminService } from './super-admin.service.js';
import { PasswordService } from '../../common/services/password.service.js';

const mockSuperAdmin = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'admin@dental-saas.com',
  password_hash: '$2b$12$hashedpassword',
  name: 'Platform Admin',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockSuperAdminService = {
  findByEmail: jest.fn(),
};

const mockPasswordService = {
  verify: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock.super.admin.token'),
};

describe('SuperAdminAuthService', () => {
  let service: SuperAdminAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminAuthService,
        { provide: SuperAdminService, useValue: mockSuperAdminService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<SuperAdminAuthService>(SuperAdminAuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = { email: 'admin@dental-saas.com', password: 'StrongP@ss1' };

    it('should return access_token and super_admin on valid credentials', async () => {
      mockSuperAdminService.findByEmail.mockResolvedValue(mockSuperAdmin);
      mockPasswordService.verify.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('mock.super.admin.token');
      expect(result.super_admin).toEqual({
        id: mockSuperAdmin.id,
        name: mockSuperAdmin.name,
        email: mockSuperAdmin.email,
      });
    });

    it('should sign JWT with type super_admin', async () => {
      mockSuperAdminService.findByEmail.mockResolvedValue(mockSuperAdmin);
      mockPasswordService.verify.mockResolvedValue(true);

      await service.login(loginDto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockSuperAdmin.id,
        type: 'super_admin',
      });
    });

    it('should throw UnauthorizedException when admin not found', async () => {
      mockSuperAdminService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockSuperAdminService.findByEmail.mockResolvedValue(mockSuperAdmin);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      mockSuperAdminService.findByEmail.mockResolvedValue({ ...mockSuperAdmin, status: 'inactive' });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPasswordService.verify).not.toHaveBeenCalled();
    });
  });
});
