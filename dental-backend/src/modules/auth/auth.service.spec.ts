import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';
import { PasswordService } from '../../common/services/password.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';

const mockUser = {
  id: 'fff00000-1111-2222-3333-444444444444',
  clinic_id: clinicId,
  branch_id: branchId,
  name: 'Dr. Jane Smith',
  email: 'jane@clinic.com',
  password_hash: '$2b$12$hashedpassword',
  role: 'Dentist',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockUserService = {
  findByEmail: jest.fn(),
};

const mockPasswordService = {
  hash: jest.fn(),
  verify: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = { email: 'jane@clinic.com', password: 'StrongP@ss1', clinic_id: clinicId };

    it('should return access_token and user on valid credentials', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('mock.jwt.token');
      expect(result.user).toEqual({
        id: mockUser.id,
        clinic_id: mockUser.clinic_id,
        branch_id: mockUser.branch_id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        status: mockUser.status,
      });
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should sign JWT with correct payload', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(true);

      await service.login(loginDto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        type: 'user',
        clinic_id: mockUser.clinic_id,
        role: mockUser.role,
        branch_id: mockUser.branch_id,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      mockUserService.findByEmail.mockResolvedValue({ ...mockUser, status: 'inactive' });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPasswordService.verify).not.toHaveBeenCalled();
    });

    it('should call findByEmail with email and clinic_id', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(true);

      await service.login(loginDto);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.clinic_id,
      );
    });
  });
});
