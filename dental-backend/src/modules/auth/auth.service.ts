import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserService } from '../user/user.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { LoginDto, RegisterClinicDto, ChangePasswordDto } from './dto/index.js';

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    clinic_id: string;
    branch_id: string | null;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(dto: LoginDto, req?: Request): Promise<LoginResponse> {
    const user = await this.userService.findByEmail(dto.email, dto.clinic_id);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordValid = await this.passwordService.verify(dto.password, user.password_hash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      type: 'user',
      clinic_id: user.clinic_id,
      role: user.role,
      branch_id: user.branch_id,
    };

    const result = {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        clinic_id: user.clinic_id,
        branch_id: user.branch_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };

    // Await login audit so it appears immediately in audit logs
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || undefined;
    const userAgent = req?.headers?.['user-agent'] || undefined;
    await this.auditLogService
      .log({
        clinic_id: user.clinic_id,
        user_id: user.id,
        action: 'login',
        entity: 'auth',
        entity_id: user.id,
        metadata: { email: user.email, role: user.role, ...(ip ? { ip } : {}), ...(userAgent ? { user_agent: userAgent } : {}) },
      })
      .catch(() => {});

    return result;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordValid = await this.passwordService.verify(dto.old_password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    const newHash = await this.passwordService.hash(dto.new_password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash },
    });

    return { message: 'Password changed successfully' };
  }

  async register(dto: RegisterClinicDto) {
    const TRIAL_DAYS = 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    // Check if clinic email already exists
    const existingClinic = await this.prisma.clinic.findFirst({
      where: { email: dto.clinic_email },
    });
    if (existingClinic) {
      throw new ConflictException('A clinic with this email already exists');
    }

    // Create clinic + admin user in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: dto.clinic_name,
          email: dto.clinic_email,
          phone: dto.clinic_phone,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          trial_ends_at: trialEndsAt,
        },
      });

      // Check if admin email already exists in this clinic
      const existingUser = await tx.user.findUnique({
        where: { email_clinic_id: { email: dto.admin_email, clinic_id: clinic.id } },
      });
      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }

      // Create a default branch for the clinic
      const branch = await tx.branch.create({
        data: {
          clinic_id: clinic.id,
          name: 'Main Branch',
          address: dto.address || undefined,
          phone: dto.clinic_phone || undefined,
        },
      });

      const admin = await tx.user.create({
        data: {
          clinic_id: clinic.id,
          branch_id: branch.id,
          name: dto.admin_name,
          email: dto.admin_email,
          password_hash: await this.passwordService.hash(dto.admin_password),
          role: 'Admin',
          status: 'active',
        },
        select: {
          id: true,
          clinic_id: true,
          branch_id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          created_at: true,
        },
      });

      return { clinic, admin, branch };
    });

    return {
      clinic: {
        id: result.clinic.id,
        name: result.clinic.name,
        email: result.clinic.email,
        subscription_status: result.clinic.subscription_status,
        trial_ends_at: result.clinic.trial_ends_at,
      },
      admin: result.admin,
    };
  }
}
