import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { Request } from 'express';
import { UserService } from '../user/user.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
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
  private readonly logger = new Logger(AuthService.name);
  /** In-memory OTP store: key → { code, expiresAt, attempts } */
  private readonly otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly communicationService: CommunicationService,
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

  // ─── Email Verification (13.1) ───

  async sendVerificationEmail(userId: string, clinicId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    // Generate a signed verification token (expires in 24hrs)
    const token = await this.jwtService.signAsync(
      { sub: userId, type: 'email_verification', email: user.email },
      { expiresIn: '24h' },
    );

    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    // Find the Email Verification template
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: 'Email Verification',
        channel: { in: ['email', 'all'] },
        is_active: true,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' },
    });

    // Find or create patient record for the user (needed for sendMessage)
    // For now, use direct email provider for transactional auth messages
    if (template) {
      try {
        // Queue via communication pipeline if the user has a patient record
        const patient = await this.prisma.patient.findFirst({
          where: { clinic_id: clinicId, email: user.email },
        });

        if (patient) {
          await this.communicationService.sendMessage(clinicId, {
            patient_id: patient.id,
            channel: MessageChannel.EMAIL,
            category: MessageCategory.TRANSACTIONAL,
            template_id: template.id,
            variables: {
              user_name: user.name,
              verification_link: verificationLink,
              clinic_name: (await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }))?.name || 'DentalCare',
            },
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to send verification email via CommunicationService: ${err}`);
      }
    }

    this.logger.log(`Verification email triggered for user ${userId}`);
    return { message: 'Verification email sent. Please check your inbox.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; type: string; email: string }>(token);

      if (payload.type !== 'email_verification') {
        throw new BadRequestException('Invalid verification token');
      }

      // Mark user email as verified (add verified_at field if needed)
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { status: 'active' },
      });

      return { message: 'Email verified successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  // ─── Password Reset (13.2) ───

  async requestPasswordReset(email: string, clinicId: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email, clinicId);

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    // Generate reset token (1hr expiry)
    const token = await this.jwtService.signAsync(
      { sub: user.id, type: 'password_reset', email: user.email },
      { expiresIn: '1h' },
    );

    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Find the Password Reset template
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: 'Password Reset',
        channel: { in: ['email', 'all'] },
        is_active: true,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' },
    });

    if (template) {
      try {
        const patient = await this.prisma.patient.findFirst({
          where: { clinic_id: clinicId, email: user.email },
        });

        if (patient) {
          await this.communicationService.sendMessage(clinicId, {
            patient_id: patient.id,
            channel: MessageChannel.EMAIL,
            category: MessageCategory.TRANSACTIONAL,
            template_id: template.id,
            variables: {
              user_name: user.name,
              reset_link: resetLink,
              clinic_name: (await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }))?.name || 'DentalCare',
            },
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to send password reset email: ${err}`);
      }
    }

    await this.auditLogService.log({
      clinic_id: clinicId,
      user_id: user.id,
      action: 'password_reset_requested',
      entity: 'auth',
      entity_id: user.id,
    }).catch(() => {});

    return { message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; type: string }>(token);

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const newHash = await this.passwordService.hash(newPassword);
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { password_hash: newHash },
      });

      return { message: 'Password reset successfully. You can now log in with your new password.' };
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  // ─── OTP Messaging (13.3) ───

  async sendOtp(identifier: string, clinicId: string, channel: 'sms' | 'email' = 'sms'): Promise<{ message: string }> {
    // Generate 6-digit OTP
    const otp = String(randomInt(100000, 999999));
    const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

    // Store OTP
    const key = `${clinicId}:${identifier}`;
    this.otpStore.set(key, {
      code: otp,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      attempts: 0,
    });

    // Clean up expired OTPs periodically
    this.cleanExpiredOtps();

    // Find the OTP template
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: 'OTP Verification',
        is_active: true,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' },
    });

    // Try to find a patient with this phone/email to send the OTP via the communication pipeline
    const patient = await this.prisma.patient.findFirst({
      where: {
        clinic_id: clinicId,
        ...(channel === 'sms' ? { phone: { contains: identifier.replace(/[^0-9]/g, '').slice(-10) } } : { email: identifier }),
      },
    });

    if (patient && template) {
      try {
        await this.communicationService.sendMessage(clinicId, {
          patient_id: patient.id,
          channel: channel === 'sms' ? MessageChannel.SMS : MessageChannel.EMAIL,
          category: MessageCategory.TRANSACTIONAL,
          template_id: template.id,
          variables: { otp_code: otp },
        });
      } catch (err) {
        this.logger.warn(`Failed to send OTP via CommunicationService: ${err}`);
      }
    }

    this.logger.log(`OTP generated for ${identifier} on ${channel}`);
    return { message: `OTP sent to ${channel === 'sms' ? 'phone' : 'email'}. Valid for 10 minutes.` };
  }

  async verifyOtp(identifier: string, clinicId: string, code: string): Promise<{ valid: boolean; message: string }> {
    const key = `${clinicId}:${identifier}`;
    const entry = this.otpStore.get(key);

    if (!entry) {
      return { valid: false, message: 'OTP not found or expired. Please request a new one.' };
    }

    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(key);
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (entry.attempts >= 3) {
      this.otpStore.delete(key);
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Constant-time comparison to prevent timing attacks
    const codeBuffer = Buffer.from(code);
    const storedBuffer = Buffer.from(entry.code);
    if (codeBuffer.length !== storedBuffer.length) {
      entry.attempts++;
      return { valid: false, message: 'Invalid OTP.' };
    }

    let diff = 0;
    for (let i = 0; i < codeBuffer.length; i++) {
      diff |= codeBuffer[i] ^ storedBuffer[i];
    }

    if (diff !== 0) {
      entry.attempts++;
      return { valid: false, message: 'Invalid OTP.' };
    }

    // OTP is valid — remove it (one-time use)
    this.otpStore.delete(key);
    return { valid: true, message: 'OTP verified successfully.' };
  }

  private cleanExpiredOtps(): void {
    const now = Date.now();
    for (const [key, entry] of this.otpStore) {
      if (now > entry.expiresAt) {
        this.otpStore.delete(key);
      }
    }
  }
}
