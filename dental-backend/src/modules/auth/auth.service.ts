import { Injectable, UnauthorizedException, ConflictException, BadRequestException, ForbiddenException, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { Request } from 'express';
import { UserService } from '../user/user.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { SmsProvider } from '../communication/providers/sms.provider.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { WhatsAppProvider } from '../communication/providers/whatsapp.provider.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { JwtPayload, RefreshJwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import type { StringValue } from 'ms';
import { decodeHtmlEntities } from '../../common/utils/name.util.js';
import { phoneLookupVariants } from '../../common/utils/phone.util.js';
import { LoginDto, LookupDto, RegisterClinicDto, ChangePasswordDto } from './dto/index.js';
import { AutomationService } from '../automation/automation.service.js';

/** Synthetic clinic ID used to configure the platform-level SMTP transporter */
const PLATFORM_CLINIC_ID = '__platform__';

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  /** True only on the very first login of a directory-only clinic — triggers the in-app demo request popup. */
  show_demo_popup?: boolean;
  user: {
    id: string;
    clinic_id: string;
    branch_id: string | null;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    email_verified: boolean;
    phone_verified: boolean;
    requires_verification: boolean;
    must_change_password: boolean;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** In-memory OTP store: key → { code, expiresAt, attempts } */
  private readonly otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

  /** Registration OTP store (pre-signup, no clinic_id): phone → { code, expiresAt, attempts } */
  private readonly regOtpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

  /** Rate-limit tracker for registration OTP sends: phone → list of send timestamps */
  private readonly regOtpSendTracker = new Map<string, number[]>();

  private static readonly META_GRAPH_API = 'https://graph.facebook.com/v21.0';

  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly communicationService: CommunicationService,
    private readonly smsProvider: SmsProvider,
    private readonly emailProvider: EmailProvider,
    private readonly whatsapp: WhatsAppProvider,
    private readonly automationService: AutomationService,
  ) {}

  private readonly directoryClinicSelect = {
    is_suspended: true,
    subscription_status: true,
    is_directory_only: true,
    directory_first_login_at: true,
    directory_approved_at: true,
    listed_in_directory: true,
  } as const;

  /** Clinic came from the public directory listing (free or approved). */
  private isDirectoryListedClinic(
    clinic: {
      is_directory_only: boolean;
      directory_approved_at: Date | null;
      subscription_status: string;
      listed_in_directory: boolean;
    } | null,
  ): boolean {
    if (!clinic) return false;
    return (
      clinic.is_directory_only ||
      !!clinic.directory_approved_at ||
      clinic.subscription_status === 'directory' ||
      clinic.listed_in_directory
    );
  }

  /** Stamp first-login timestamp and return whether to show the demo popup. */
  private async applyDirectoryFirstLogin(
    clinicId: string,
    clinic: { directory_first_login_at: Date | null } | null,
    isDirectory: boolean,
  ): Promise<boolean> {
    const isFirst = isDirectory && !clinic?.directory_first_login_at;
    if (isFirst) {
      await this.prisma.clinic
        .update({ where: { id: clinicId }, data: { directory_first_login_at: new Date() } })
        .catch((e) => this.logger.warn(`Failed to stamp directory_first_login_at: ${(e as Error).message}`));
    }
    return isFirst;
  }

  /** Long-lived token that can only be exchanged for a new access token at /auth/refresh. */
  private async signRefreshToken(userId: string, clinicId: string): Promise<string> {
    const payload: RefreshJwtPayload = { sub: userId, type: 'refresh', clinic_id: clinicId };
    const expiresIn = this.configService.get<string>('app.jwtRefreshExpiresIn', '90d') as StringValue;
    return this.jwtService.signAsync(payload, { expiresIn });
  }

  async lookup(dto: LookupDto) {
    // Find all users with this email across all clinics
    const users = await this.prisma.user.findMany({
      where: { email: dto.email, status: 'active' },
      include: {
        clinic: { select: { id: true, name: true, email: true, subscription_status: true } },
      },
    });

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password and collect matching users in a single pass
    const validUsers = [];
    for (const user of users) {
      if (await this.passwordService.verify(dto.password, user.password_hash)) {
        validUsers.push(user);
      }
    }

    if (validUsers.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const clinics = validUsers.map((u) => ({
      clinic_id: u.clinic.id,
      clinic_name: u.clinic.name,
      clinic_email: u.clinic.email,
      subscription_status: u.clinic.subscription_status,
      role: u.role,
    }));

    return { clinics, requires_clinic_selection: clinics.length > 1 };
  }

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

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinic_id },
      select: this.directoryClinicSelect,
    });
    if (clinic?.is_suspended) {
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact Smart Dental Desk support to reactivate.',
      });
    }
    if (clinic?.subscription_status === 'pending') {
      throw new ForbiddenException({
        code: 'PENDING_APPROVAL',
        message: 'Your account is pending approval. You will receive an email once our team has reviewed your application.',
      });
    }

    const isDirectory = this.isDirectoryListedClinic(clinic);
    const isFirstDirectoryLogin = await this.applyDirectoryFirstLogin(user.clinic_id, clinic, isDirectory);

    const payload: JwtPayload = {
      sub: user.id,
      type: 'user',
      clinic_id: user.clinic_id,
      role: user.role,
      branch_id: user.branch_id,
    };

    const requiresVerification = !user.email_verified && !user.phone_verified;

    const result = {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: await this.signRefreshToken(user.id, user.clinic_id),
      show_demo_popup: isFirstDirectoryLogin,
      user: {
        id: user.id,
        clinic_id: user.clinic_id,
        branch_id: user.branch_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        requires_verification: requiresVerification,
        must_change_password: user.must_change_password,
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

  async lookupByPhone(phone: string, password: string) {
    const phoneVariants = phoneLookupVariants(phone);
    const users = await this.prisma.user.findMany({
      where: {
        phone: { in: phoneVariants },
        status: 'active',
        phone_verified: true,
      },
      include: {
        clinic: { select: { id: true, name: true, email: true, subscription_status: true } },
      },
    });

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const validUsers = [];
    for (const user of users) {
      if (await this.passwordService.verify(password, user.password_hash)) {
        validUsers.push(user);
      }
    }

    if (validUsers.length === 0) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const clinics = validUsers.map((u) => ({
      clinic_id: u.clinic.id,
      clinic_name: u.clinic.name,
      clinic_email: u.clinic.email,
      subscription_status: u.clinic.subscription_status,
      role: u.role,
    }));

    return { clinics, requires_clinic_selection: clinics.length > 1 };
  }

  async loginByPhone(phone: string, password: string, clinicId: string, req?: Request): Promise<LoginResponse> {
    const phoneVariants = phoneLookupVariants(phone);
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: phoneVariants }, clinic_id: clinicId, status: 'active', phone_verified: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const passwordValid = await this.passwordService.verify(password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinic_id },
      select: this.directoryClinicSelect,
    });
    if (clinic?.is_suspended) {
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact Smart Dental Desk support to reactivate.',
      });
    }
    if (clinic?.subscription_status === 'pending') {
      throw new ForbiddenException({
        code: 'PENDING_APPROVAL',
        message: 'Your account is pending approval. You will receive an email once our team has reviewed your application.',
      });
    }

    const isDirectory = this.isDirectoryListedClinic(clinic);
    const isFirstDirectoryLogin = await this.applyDirectoryFirstLogin(user.clinic_id, clinic, isDirectory);

    const payload: JwtPayload = {
      sub: user.id,
      type: 'user',
      clinic_id: user.clinic_id,
      role: user.role,
      branch_id: user.branch_id,
    };

    const requiresVerification = !user.email_verified && !user.phone_verified;

    const result: LoginResponse = {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: await this.signRefreshToken(user.id, user.clinic_id),
      show_demo_popup: isFirstDirectoryLogin,
      user: {
        id: user.id,
        clinic_id: user.clinic_id,
        branch_id: user.branch_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        requires_verification: requiresVerification,
        must_change_password: user.must_change_password,
      },
    };

    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || undefined;
    const userAgent = req?.headers?.['user-agent'] || undefined;
    await this.auditLogService
      .log({
        clinic_id: user.clinic_id,
        user_id: user.id,
        action: 'login',
        entity: 'auth',
        entity_id: user.id,
        metadata: { phone: user.phone, role: user.role, ...(ip ? { ip } : {}), ...(userAgent ? { user_agent: userAgent } : {}) },
      })
      .catch(() => {});

    return result;
  }

  /**
   * Exchange a valid refresh token for a fresh access token (and a rotated
   * refresh token). Lets the mobile app restore a working session after a
   * PIN / biometric unlock without re-collecting the password.
   */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, clinic_id: payload.clinic_id },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Account is no longer active');
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinic_id },
      select: { is_suspended: true },
    });
    if (clinic?.is_suspended) {
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact Smart Dental Desk support to reactivate.',
      });
    }

    const accessPayload: JwtPayload = {
      sub: user.id,
      type: 'user',
      clinic_id: user.clinic_id,
      role: user.role,
      branch_id: user.branch_id,
    };

    return {
      access_token: await this.jwtService.signAsync(accessPayload),
      refresh_token: await this.signRefreshToken(user.id, user.clinic_id),
    };
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
      data: { password_hash: newHash, must_change_password: false },
    });

    return { message: 'Password changed successfully' };
  }

  async setInitialPassword(userId: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.must_change_password) throw new BadRequestException('Password change not required for this account');

    const newHash = await this.passwordService.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash, must_change_password: false },
    });
    return { message: 'Password set successfully' };
  }

  /** In-memory OTP store for login-via-OTP flow (no clinic_id needed at send time) */
  private readonly loginOtpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

  /** Normalize login identifier to a stable OTP-store key and phone lookup variants. */
  private normalizeLoginIdentifier(identifier: string): { storeKey: string; isEmail: boolean; phoneVariants: string[] } {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');
    if (isEmail) {
      return { storeKey: trimmed.toLowerCase(), isEmail, phoneVariants: [] };
    }
    const variants = phoneLookupVariants(trimmed);
    const digits = trimmed.replace(/[^0-9]/g, '');
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    return { storeKey: last10 || trimmed.toLowerCase(), isEmail, phoneVariants: variants };
  }

  /** Platform SMS OTP — same SMSGatewayHub + DLT pattern as listing phone OTP. */
  private async sendPlatformLoginSms(phone: string, otp: string): Promise<void> {
    const apiKey = this.configService.get<string>('app.sms.apiKey');
    const templateId = this.configService.get<string>('app.sms.defaultDltTemplateId');
    if (!apiKey || !templateId) {
      this.logger.warn('Platform SMS not configured — login phone OTP not sent');
      return;
    }

    const senderId = this.configService.get<string>('app.sms.senderId') || 'SDDSK';
    const entityId = this.configService.get<string>('app.sms.entityId') || '';
    const templateBody =
      this.configService.get<string>('app.sms.dltTemplateBody') ||
      "Your otp for {#var#} by grats it is {#var#}, otp valid for 10min, please don't share with any one,";

    let slot = 0;
    const text = templateBody.replace(/\{#var#\}/g, () => {
      slot++;
      if (slot === 1) return 'logging in to Smart Dental Desk';
      if (slot === 2) return otp;
      return '';
    });

    const digits = phone.replace(/[^0-9]/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;

    const params = new URLSearchParams({
      APIKey: apiKey,
      senderid: senderId,
      channel: '2',
      DCS: '0',
      flashsms: '0',
      number,
      text,
      route: '47',
      dlttemplateid: templateId,
    });
    if (entityId) params.set('EntityId', entityId);

    const res = await fetch(`https://www.smsgatewayhub.com/api/mt/SendSMS?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json() as Record<string, unknown>;
    const ok = data['ErrorCode'] === '000' || data['ErrorCode'] === 0;
    if (!ok) {
      const errMsg = String(data['ErrorMessage'] ?? 'SMS gateway error');
      throw new Error(errMsg);
    }
  }

  async sendLoginOtp(identifier: string): Promise<{ message: string }> {
    const { storeKey, isEmail, phoneVariants } = this.normalizeLoginIdentifier(identifier);

    // Check at least one active user exists — don't reveal which
    const user = await this.prisma.user.findFirst({
      where: {
        status: 'active',
        ...(isEmail ? { email: storeKey } : { phone: { in: phoneVariants } }),
      },
      select: { id: true, clinic_id: true, email: true, phone: true },
    });

    const otp = String(randomInt(100000, 999999));
    this.loginOtpStore.set(storeKey, {
      code: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    if (!user) {
      // Don't reveal non-existence — silently succeed
      return { message: 'If an account exists, a code has been sent.' };
    }

    if (isEmail && user.email) {
      if (this.ensurePlatformEmailConfigured()) {
        await this.emailProvider.send({
          to: user.email,
          subject: `${otp} — Your Smart Dental Desk login code`,
          body: `Your login code is ${otp}. Valid for 10 minutes.`,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
              <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:20px;font-weight:700;color:#3b5bff;">Smart</span>
                <span style="font-size:20px;font-weight:700;color:#1ec991;margin-left:4px;">Dental Desk</span>
              </div>
              <h2 style="font-size:18px;font-weight:600;color:#111827;text-align:center;margin:0 0 8px;">Your login code</h2>
              <p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 28px;">Use this code to sign in to your Smart Dental Desk account.</p>
              <div style="background:#f3f4f6;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#111827;">${otp}</span>
              </div>
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">This code expires in 10 minutes. Do not share it with anyone.</p>
            </div>`,
          clinicId: PLATFORM_CLINIC_ID,
        });
      }
    } else if (!isEmail && user.phone) {
      try {
        await this.sendPlatformLoginSms(user.phone, otp);
      } catch (err) {
        this.logger.warn(`Login OTP SMS failed to ${user.phone}: ${(err as Error).message}`);
      }
    }

    return { message: 'If an account exists, a code has been sent.' };
  }

  async loginWithOtp(identifier: string, code: string, clinicId?: string, req?: Request): Promise<LoginResponse | { requires_clinic_selection: true; clinics: { clinic_id: string; clinic_name: string; clinic_email: string; subscription_status: string; role: string }[] }> {
    const { storeKey, isEmail, phoneVariants } = this.normalizeLoginIdentifier(identifier);
    const entry = this.loginOtpStore.get(storeKey);

    if (!entry) throw new UnauthorizedException('OTP not found or expired. Please request a new one.');
    if (Date.now() > entry.expiresAt) {
      this.loginOtpStore.delete(storeKey);
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }
    if (entry.attempts >= 3) {
      this.loginOtpStore.delete(storeKey);
      throw new UnauthorizedException('Too many failed attempts. Please request a new OTP.');
    }

    const a = Buffer.from(code);
    const b = Buffer.from(entry.code);
    let diff = a.length !== b.length ? 1 : 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a[i] ^ b[i];

    if (diff !== 0) {
      entry.attempts++;
      throw new UnauthorizedException('Invalid OTP. Please try again.');
    }

    const users = await this.prisma.user.findMany({
      where: {
        status: 'active',
        ...(isEmail ? { email: storeKey } : { phone: { in: phoneVariants } }),
      },
      include: { clinic: { select: { name: true, email: true, subscription_status: true } } },
    });

    if (users.length === 0) throw new UnauthorizedException('No active account found.');

    // If clinic not yet selected and multiple clinics, return list without consuming OTP
    if (!clinicId && users.length > 1) {
      return {
        requires_clinic_selection: true as const,
        clinics: users.map((u) => ({
          clinic_id: u.clinic_id,
          clinic_name: u.clinic.name,
          clinic_email: u.clinic.email || '',
          subscription_status: u.clinic.subscription_status,
          role: u.role,
        })),
      };
    }

    // Consume OTP
    this.loginOtpStore.delete(storeKey);

    const user = clinicId ? users.find((u) => u.clinic_id === clinicId) : users[0];
    if (!user) throw new UnauthorizedException('Invalid clinic selection.');

    // OTP proves ownership — mark identifier as verified if it wasn't already
    if (isEmail && !user.email_verified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { email_verified: true } });
      user.email_verified = true;
    } else if (!isEmail && !user.phone_verified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { phone_verified: true } });
      user.phone_verified = true;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinic_id },
      select: this.directoryClinicSelect,
    });
    if (clinic?.is_suspended) throw new ForbiddenException({ code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended.' });
    if (clinic?.subscription_status === 'pending') {
      throw new ForbiddenException({
        code: 'PENDING_APPROVAL',
        message: 'Your account is pending approval. You will receive an email once our team has reviewed your application.',
      });
    }

    const isDirectory = this.isDirectoryListedClinic(clinic);
    const isFirstDirectoryLogin = await this.applyDirectoryFirstLogin(user.clinic_id, clinic, isDirectory);

    const payload: JwtPayload = { sub: user.id, type: 'user', clinic_id: user.clinic_id, role: user.role, branch_id: user.branch_id };
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || undefined;
    const userAgent = req?.headers?.['user-agent'] || undefined;
    await this.auditLogService.log({ clinic_id: user.clinic_id, user_id: user.id, action: 'login_otp', entity: 'auth', entity_id: user.id, metadata: { role: user.role, ...(ip ? { ip } : {}), ...(userAgent ? { user_agent: userAgent } : {}) } }).catch(() => {});

    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: await this.signRefreshToken(user.id, user.clinic_id),
      show_demo_popup: isFirstDirectoryLogin,
      user: {
        id: user.id,
        clinic_id: user.clinic_id,
        branch_id: user.branch_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        requires_verification: false,
        must_change_password: user.must_change_password,
      },
    };
  }

  async register(dto: RegisterClinicDto) {
    const PAID_TRIAL_DAYS = 14;
    const FREE_GRACE_DAYS = 30;

    // Validate WhatsApp phone verification token
    try {
      const payload = await this.jwtService.verifyAsync<{ phone: string; type: string }>(
        dto.phone_verification_token,
      );
      if (payload.type !== 'phone_reg_verified') {
        throw new BadRequestException('Invalid phone verification token');
      }
      if (payload.phone !== dto.admin_phone) {
        throw new BadRequestException('Verified phone does not match the admin phone provided');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Phone verification token is invalid or has expired. Please verify your WhatsApp number again.');
    }

    // Check if clinic email already exists
    const existingClinic = await this.prisma.clinic.findFirst({
      where: { email: dto.clinic_email },
    });
    if (existingClinic) {
      throw new ConflictException('A clinic with this email already exists');
    }

    // Check if this phone number has already been used to register a clinic
    const existingPhoneUser = await this.prisma.user.findFirst({
      where: { phone: dto.admin_phone, role: 'SuperAdmin' },
    });
    if (existingPhoneUser) {
      throw new ConflictException('A clinic is already registered with this phone number. Please use a different number or sign in.');
    }

    // Resolve the selected plan (if any).
    // Free plan: subscription is immediately active (no billing trial), but
    // trial_ends_at is still set to 30 days out so PlanLimitService can use
    // it as a grace window (20 resources/month → 10 after grace expires).
    // Paid plans start a 14-day billing trial as before.
    let planId: string | undefined;
    let isFreePlan = false;
    if (dto.plan_key && dto.plan_key !== 'trial') {
      const plan = await this.prisma.plan.findFirst({
        where: { name: { contains: dto.plan_key, mode: 'insensitive' } },
      });
      if (plan) {
        planId = plan.id;
        isFreePlan = plan.name.toLowerCase() === 'free';
      }
    }

    const billingCycle = dto.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    const graceDays = isFreePlan ? FREE_GRACE_DAYS : PAID_TRIAL_DAYS;
    const trialEndsAt = (() => {
      const d = new Date();
      d.setDate(d.getDate() + graceDays);
      return d;
    })();
    // New signups require super admin approval before accessing the dashboard.
    // Approved clinics are moved to 'trial' or 'active' by the super admin.
    const requireApproval = this.configService.get<string>('REQUIRE_SIGNUP_APPROVAL') !== 'false';
    const subscriptionStatus = requireApproval ? 'pending' : (isFreePlan ? 'active' : 'trial');

    // Create clinic + admin user in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: decodeHtmlEntities(dto.clinic_name),
          email: dto.clinic_email,
          phone: dto.clinic_phone,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          // Listing goes through approval; set pending if requested, never live immediately
          listed_in_directory: false,
          ...(dto.listed_in_directory
            ? { directory_approval_status: 'pending', directory_requested_at: new Date() }
            : {}),
          ...(dto.specialties ? { specialties: dto.specialties } : {}),
          trial_ends_at: trialEndsAt,
          subscription_status: subscriptionStatus,
          billing_cycle: billingCycle,
          ...(planId ? { plan_id: planId } : {}),
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
          name: decodeHtmlEntities(dto.admin_name),
          email: dto.admin_email,
          phone: dto.admin_phone,
          password_hash: await this.passwordService.hash(dto.admin_password),
          role: 'SuperAdmin',
          is_doctor: dto.is_doctor ?? false,
          license_number: dto.is_doctor ? (dto.license_number ?? null) : null,
          status: 'active',
          phone_verified: true, // phone was verified via OTP before registration
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

    this.automationService.seedClinicAutomationDefaults(result.clinic.id).catch((err) =>
      this.logger.warn(`Failed to seed automation defaults for clinic ${result.clinic.id}: ${(err as Error).message}`),
    );

    this.prisma.clinicCommunicationSettings.upsert({
      where: { clinic_id: result.clinic.id },
      create: { clinic_id: result.clinic.id, enable_whatsapp: true },
      update: { enable_whatsapp: true },
    }).catch((err) =>
      this.logger.warn(`Failed to seed communication settings for clinic ${result.clinic.id}: ${(err as Error).message}`),
    );

    // Fire-and-forget onboarding emails (don't block the response)
    this.sendOnboardingWelcomeEmail({
      admin_name: result.admin.name,
      admin_email: result.admin.email,
      admin_password: dto.admin_password,
      clinic_name: result.clinic.name,
      subscription_status: result.clinic.subscription_status,
      trial_ends_at: result.clinic.trial_ends_at,
    }).catch((err) =>
      this.logger.warn(`Failed to send onboarding welcome email: ${err.message}`),
    );

    this.sendOnboardingAdminAlertEmail({
      clinic_name: result.clinic.name,
      clinic_email: result.clinic.email,
      clinic_phone: result.clinic.phone,
      city: result.clinic.city,
      state: result.clinic.state,
      country: result.clinic.country,
      subscription_status: result.clinic.subscription_status,
      trial_ends_at: result.clinic.trial_ends_at,
      admin_name: result.admin.name,
      admin_email: result.admin.email,
      created_at: result.clinic.created_at,
    }).catch((err) =>
      this.logger.warn(`Failed to send onboarding admin alert email: ${err.message}`),
    );

    // Fire-and-forget signup WhatsApp (acknowledgement to admin + internal alert)
    this.sendSignupReceivedWhatsApp(dto.admin_phone, result.admin.name, result.clinic.name).catch((err) =>
      this.logger.warn(`Failed to send signup received WhatsApp: ${err.message}`),
    );
    this.sendSignupAdminAlertWhatsApp(
      result.clinic.name,
      result.admin.name,
      result.admin.email,
      dto.admin_phone,
    ).catch((err) =>
      this.logger.warn(`Failed to send signup admin alert WhatsApp: ${err.message}`),
    );

    return {
      clinic: {
        id: result.clinic.id,
        name: result.clinic.name,
        email: result.clinic.email,
        subscription_status: result.clinic.subscription_status,
        trial_ends_at: result.clinic.trial_ends_at,
        plan_id: result.clinic.plan_id,
      },
      admin: result.admin,
    };
  }

  // ── Directory listing claim ───────────────────────────────────────────────────

  async getClaimPreview(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true, name: true, city: true, state: true, address: true,
        phone: true, email: true, is_directory_only: true,
        directory_approval_status: true,
        _count: { select: { users: true } },
      },
    });
    if (!clinic) throw new NotFoundException('Listing not found');
    if (!clinic.is_directory_only) throw new BadRequestException('This clinic is already a full subscriber');
    if (clinic.directory_approval_status !== 'approved') throw new BadRequestException('This listing has not been approved yet');
    if (clinic._count.users > 0) throw new ConflictException('This listing has already been claimed');
    return {
      id: clinic.id,
      name: clinic.name,
      city: clinic.city,
      state: clinic.state,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
    };
  }

  async claimDirectoryListing(dto: {
    clinic_id: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
    phone_verification_token: string;
    is_doctor?: boolean;
    plan_key?: string;
    billing_cycle?: string;
  }) {
    // Verify phone token
    let verifiedPhone: string;
    try {
      const payload = await this.jwtService.verifyAsync<{ phone: string; type: string }>(
        dto.phone_verification_token,
      );
      if (payload.type !== 'phone_reg_verified') throw new BadRequestException('Invalid phone verification token');
      verifiedPhone = payload.phone;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Phone verification token is invalid or expired. Please verify your number again.');
    }

    // Validate clinic is still claimable
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinic_id },
      include: { _count: { select: { users: true } } },
    });
    if (!clinic) throw new NotFoundException('Listing not found');
    if (!clinic.is_directory_only) throw new BadRequestException('Already a full subscriber');
    if (clinic.directory_approval_status !== 'approved') throw new BadRequestException('Listing not yet approved');
    if (clinic._count.users > 0) throw new ConflictException('This listing has already been claimed');

    // Check email uniqueness
    const existingEmail = await this.prisma.user.findFirst({ where: { email: dto.admin_email } });
    if (existingEmail) throw new ConflictException('An account with this email already exists');

    // Resolve plan
    const FREE_GRACE = 30;
    const TRIAL_DAYS = 14;
    let planId: string | undefined;
    let isFreePlan = false;
    if (dto.plan_key && dto.plan_key !== 'trial') {
      const plan = await this.prisma.plan.findFirst({
        where: { name: { contains: dto.plan_key, mode: 'insensitive' } },
      });
      if (plan) { planId = plan.id; isFreePlan = plan.name.toLowerCase() === 'free'; }
    }
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + (isFreePlan ? FREE_GRACE : TRIAL_DAYS));

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedClinic = await tx.clinic.update({
        where: { id: dto.clinic_id },
        data: {
          is_directory_only: false,
          subscription_status: isFreePlan ? 'active' : 'trial',
          trial_ends_at: trialEndsAt,
          billing_cycle: dto.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
          ...(planId ? { plan_id: planId } : {}),
        },
      });
      const branch = await tx.branch.create({
        data: {
          clinic_id: dto.clinic_id,
          name: 'Main Branch',
          address: clinic.address || undefined,
          phone: clinic.phone || undefined,
        },
      });
      const admin = await tx.user.create({
        data: {
          clinic_id: dto.clinic_id,
          branch_id: branch.id,
          name: decodeHtmlEntities(dto.admin_name),
          email: dto.admin_email,
          phone: verifiedPhone,
          password_hash: await this.passwordService.hash(dto.admin_password),
          role: 'SuperAdmin',
          is_doctor: dto.is_doctor ?? false,
          status: 'active',
          phone_verified: true,
        },
        select: { id: true, clinic_id: true, branch_id: true, name: true, email: true, role: true, status: true },
      });
      return { clinic: updatedClinic, admin };
    });

    this.sendOnboardingWelcomeEmail({
      admin_name: result.admin.name,
      admin_email: result.admin.email,
      admin_password: dto.admin_password,
      clinic_name: result.clinic.name,
      subscription_status: result.clinic.subscription_status,
      trial_ends_at: result.clinic.trial_ends_at,
    }).catch((err) => this.logger.warn(`Claim welcome email failed: ${err.message}`));

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

  // ── Email: Welcome email to newly onboarded clinic admin (self-serve signup) ──
  private async sendOnboardingWelcomeEmail(data: {
    admin_name: string;
    admin_email: string;
    admin_password: string;
    clinic_name: string;
    subscription_status: string;
    trial_ends_at: Date | null;
  }) {
    if (!this.ensurePlatformEmailConfigured()) return;

    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';
    const loginUrl = `${frontendUrl}/login`;
    const planLine = data.trial_ends_at
      ? `You're on a <strong>free trial</strong> that ends on <strong>${data.trial_ends_at.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.`
      : `Your subscription is <strong>active</strong>.`;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Welcome to Smart Dental Desk</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.admin_name},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Your clinic <strong>${data.clinic_name}</strong> is now set up on Smart Dental Desk. ${planLine}
          </p>
          <p style="color: #4b5563; line-height: 1.6;">You can sign in with the email you used during signup:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #1f2937;"><strong>Email:</strong> ${data.admin_email}</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${loginUrl}" style="background: #0ea5e9; color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Sign In</a>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">Getting started:</p>
          <ul style="color: #4b5563; line-height: 1.8;">
            <li>Add your branch details and operating hours</li>
            <li>Invite your dentists and staff</li>
            <li>Configure communication channels (SMS, email, WhatsApp)</li>
            <li>Start adding patients and booking appointments</li>
          </ul>
          <p style="color: #4b5563; line-height: 1.6;">
            If you have any questions, just reply to this email — we're happy to help.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Smart Dental Desk — Modern dental practice management<br/>
            <a href="https://smartdentaldesk.com" style="color: #6366f1;">smartdentaldesk.com</a>
          </p>
        </div>
      </div>`;

    await this.emailProvider.send({
      to: data.admin_email,
      subject: `Welcome to Smart Dental Desk — ${data.clinic_name}`,
      body: `Hi ${data.admin_name}, your clinic ${data.clinic_name} is now set up on Smart Dental Desk. Sign in at ${loginUrl} with ${data.admin_email}.`,
      html,
      clinicId: PLATFORM_CLINIC_ID,
    });
    this.logger.log(`Onboarding welcome email sent to ${data.admin_email}`);
  }

  // ── Email: New clinic onboarding alert to super admin ──
  private async sendOnboardingAdminAlertEmail(data: {
    clinic_name: string;
    clinic_email: string;
    clinic_phone: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    subscription_status: string;
    trial_ends_at: Date | null;
    admin_name: string;
    admin_email: string;
    created_at: Date;
  }) {
    if (!this.ensurePlatformEmailConfigured()) return;

    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';
    const adminEmail = this.configService.get<string>('app.adminEmail') || 'prasanthshanmugam10@gmail.com';
    const location = [data.city, data.state, data.country].filter(Boolean).join(', ') || 'Not specified';
    const planLabel = data.subscription_status === 'trial' && data.trial_ends_at
      ? `Trial (ends ${data.trial_ends_at.toLocaleDateString('en-IN')})`
      : data.subscription_status;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; padding: 20px 32px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #fff; margin: 0;">New Clinic Signed Up</h2>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Clinic</td><td style="padding: 8px 0; font-weight: 600;">${data.clinic_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Clinic Email</td><td style="padding: 8px 0;"><a href="mailto:${data.clinic_email}">${data.clinic_email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Clinic Phone</td><td style="padding: 8px 0;">${data.clinic_phone || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Location</td><td style="padding: 8px 0;">${location}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Subscription</td><td style="padding: 8px 0;">${planLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Admin</td><td style="padding: 8px 0;">${data.admin_name} &lt;${data.admin_email}&gt;</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Signed Up At</td><td style="padding: 8px 0;">${data.created_at.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Source</td><td style="padding: 8px 0;">Self-serve signup</td></tr>
          </table>
          <div style="margin-top: 24px; text-align: center;">
            <a href="${frontendUrl}/super-admin/clinics" style="background: #6366f1; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Dashboard</a>
          </div>
        </div>
      </div>`;

    await this.emailProvider.send({
      to: adminEmail,
      subject: `New Clinic Signed Up: ${data.clinic_name} (${planLabel})`,
      body: `New clinic signed up: ${data.clinic_name} (${data.clinic_email}). Admin: ${data.admin_name} <${data.admin_email}>. Subscription: ${planLabel}. Location: ${location}.`,
      html,
      clinicId: PLATFORM_CLINIC_ID,
    });
    this.logger.log(`Onboarding admin alert email sent to ${adminEmail}`);
  }

  /** Ensure platform SMTP transporter is configured */
  private ensurePlatformEmailConfigured(): boolean {
    if (this.emailProvider.isConfigured(PLATFORM_CLINIC_ID)) return true;

    const host = this.configService.get<string>('app.smtp.host');
    const user = this.configService.get<string>('app.smtp.user');
    if (host && user) {
      this.emailProvider.configure(PLATFORM_CLINIC_ID, {
        host,
        port: this.configService.get<number>('app.smtp.port') || 587,
        user,
        pass: this.configService.get<string>('app.smtp.pass') || '',
        from: this.configService.get<string>('app.smtp.from') || user,
        secure: this.configService.get<boolean>('app.smtp.secure') || false,
      }, 'smtp-env');
      return true;
    }

    this.logger.warn('SMTP not configured — onboarding emails will be skipped');
    return false;
  }

  /** Ensure the platform WhatsApp provider is configured from env vars */
  private ensurePlatformWhatsAppConfigured(): boolean {
    if (this.whatsapp.isConfigured(PLATFORM_CLINIC_ID)) return true;

    const accessToken = this.configService.get<string>('app.whatsapp.accessToken');
    const phoneNumberId = this.configService.get<string>('app.whatsapp.phoneNumberId');
    if (accessToken && phoneNumberId) {
      this.whatsapp.configure(PLATFORM_CLINIC_ID, {
        accessToken,
        phoneNumberId,
        wabaId: this.configService.get<string>('app.whatsapp.wabaId') || '',
      }, 'meta-cloud-env');
      return true;
    }

    this.logger.warn('WhatsApp not configured — clinic-signup WhatsApp messages will be skipped');
    return false;
  }

  /** WhatsApp: acknowledge a self-signup is received and under review */
  private async sendSignupReceivedWhatsApp(phone: string | null, adminName: string, clinicName: string) {
    if (!phone || !this.ensurePlatformWhatsAppConfigured()) return;
    await this.whatsapp.send({
      to: phone,
      body: `Hi ${adminName}, thank you for signing up ${clinicName} on Smart Dental Desk! Your application is under review.`,
      templateId: 'clinic_signup_received',
      variables: { '1': adminName, '2': clinicName },
      language: 'en',
      clinicId: PLATFORM_CLINIC_ID,
    });
  }

  /** WhatsApp: internal alert to the platform team about a new signup */
  private async sendSignupAdminAlertWhatsApp(clinicName: string, adminName: string, email: string, phone: string | null) {
    if (!this.ensurePlatformWhatsAppConfigured()) return;
    const adminPhone = this.configService.get<string>('app.adminWhatsappPhone', '916366767512');
    await this.whatsapp.send({
      to: adminPhone,
      body: `New clinic signup: ${clinicName} — ${adminName} (${email}, ${phone ?? 'no phone'})`,
      templateId: 'clinic_signup_admin_alert',
      variables: { '1': clinicName, '2': adminName, '3': email, '4': phone ?? 'Not provided' },
      language: 'en',
      clinicId: PLATFORM_CLINIC_ID,
    });
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

        const clinicName = (await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }))?.name || 'Smart Dental Desk';

        if (patient) {
          await this.communicationService.sendMessage(clinicId, {
            patient_id: patient.id,
            channel: MessageChannel.EMAIL,
            category: MessageCategory.TRANSACTIONAL,
            template_id: template.id,
            variables: {
              user_name: user.name,
              verification_link: verificationLink,
              clinic_name: clinicName,
            },
          });
        } else {
          // Staff/admin user — no patient record, send directly via email provider
          await this.sendEmailDirect(clinicId, user.email, user.name, clinicName, verificationLink);
        }
      } catch (err) {
        this.logger.warn(`Failed to send verification email via CommunicationService: ${err}`);
      }
    } else {
      // No template found — send plain email directly
      try {
        const clinicName = (await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }))?.name || 'Smart Dental Desk';
        await this.sendEmailDirect(clinicId, user.email, user.name, clinicName, verificationLink);
      } catch (err) {
        this.logger.warn(`Failed to send verification email directly: ${err}`);
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

      // Mark user email as verified
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { status: 'active', email_verified: true },
      });

      return { message: 'Email verified successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async verifyPhone(userId: string, clinicId: string, phone: string, code: string): Promise<{ valid: boolean; message: string }> {
    const result = await this.verifyOtp(phone, clinicId, code);
    if (result.valid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone_verified: true, phone },
      });
    }
    return result;
  }

  /** Ensure email provider is configured for clinicId (falls back to env SMTP), then send directly. */
  private async sendEmailDirect(clinicId: string, to: string, name: string, clinicName: string, verificationLink: string): Promise<void> {
    // Configure from env if not already set up for this clinic
    if (!this.emailProvider.isConfigured(clinicId)) {
      const host = this.configService.get<string>('app.smtp.host');
      const user = this.configService.get<string>('app.smtp.user');
      if (host && user) {
        this.emailProvider.configure(clinicId, {
          host,
          port: this.configService.get<number>('app.smtp.port') || 587,
          user,
          pass: this.configService.get<string>('app.smtp.pass') || '',
          from: this.configService.get<string>('app.smtp.from') || user,
          secure: this.configService.get<boolean>('app.smtp.secure') || false,
        }, 'smtp-env');
      }
    }

    await this.emailProvider.send({
      to,
      subject: 'Verify your email address',
      body: `Hi ${name},\n\nPlease verify your email by clicking the link below:\n\n${verificationLink}\n\nThis link expires in 24 hours.\n\n— ${clinicName}`,
      html: `<p>Hi ${name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verificationLink}" style="background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Verify Email</a></p><p>This link expires in 24 hours.</p><p>— ${clinicName}</p>`,
      clinicId,
    });
  }

  // ─── Password Reset (13.2) ───

  async requestPasswordReset(email: string, clinicId?: string): Promise<{ message: string }> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3001';
    const SAFE_RESPONSE = { message: 'If an account exists with this email, a password reset link has been sent.' };

    // Resolve the list of users to reset: either a single clinic-scoped user or all matching accounts
    const users = clinicId
      ? await (async () => {
          const u = await this.userService.findByEmail(email, clinicId);
          return u ? [u] : [];
        })()
      : await this.prisma.user.findMany({
          where: { email, status: 'active' },
        });

    if (users.length === 0) {
      return SAFE_RESPONSE;
    }

    for (const user of users) {
      const cid = user.clinic_id;

      // Generate reset token (1hr expiry)
      const token = await this.jwtService.signAsync(
        { sub: user.id, type: 'password_reset', email: user.email },
        { expiresIn: '1h' },
      );

      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      // Find the Password Reset template for this clinic (or global fallback)
      const template = await this.prisma.messageTemplate.findFirst({
        where: {
          template_name: 'Password Reset',
          channel: { in: ['email', 'all'] },
          is_active: true,
          OR: [{ clinic_id: cid }, { clinic_id: null }],
        },
        orderBy: { clinic_id: 'desc' },
      });

      const clinicName =
        (await this.prisma.clinic.findUnique({ where: { id: cid }, select: { name: true } }))?.name ||
        'Smart Dental Desk';

      try {
        if (template) {
          const patient = await this.prisma.patient.findFirst({
            where: { clinic_id: cid, email: user.email },
          });

          if (patient) {
            await this.communicationService.sendMessage(cid, {
              patient_id: patient.id,
              channel: MessageChannel.EMAIL,
              category: MessageCategory.TRANSACTIONAL,
              template_id: template.id,
              variables: { user_name: user.name, reset_link: resetLink, clinic_name: clinicName },
            });
          } else {
            await this.sendPasswordResetEmailDirect(cid, user.email, user.name, clinicName, resetLink);
          }
        } else {
          await this.sendPasswordResetEmailDirect(cid, user.email, user.name, clinicName, resetLink);
        }
      } catch (err) {
        this.logger.warn(`Failed to send password reset email for user ${user.id}: ${err}`);
      }

      await this.auditLogService
        .log({
          clinic_id: cid,
          user_id: user.id,
          action: 'password_reset_requested',
          entity: 'auth',
          entity_id: user.id,
        })
        .catch(() => {});
    }

    return SAFE_RESPONSE;
  }

  private async sendPasswordResetEmailDirect(
    clinicId: string,
    to: string,
    name: string,
    clinicName: string,
    resetLink: string,
  ): Promise<void> {
    if (!this.emailProvider.isConfigured(clinicId)) {
      const host = this.configService.get<string>('app.smtp.host');
      const user = this.configService.get<string>('app.smtp.user');
      if (host && user) {
        this.emailProvider.configure(
          clinicId,
          {
            host,
            port: this.configService.get<number>('app.smtp.port') || 587,
            user,
            pass: this.configService.get<string>('app.smtp.pass') || '',
            from: this.configService.get<string>('app.smtp.from') || user,
            secure: this.configService.get<boolean>('app.smtp.secure') || false,
          },
          'smtp-env',
        );
      }
    }

    await this.emailProvider.send({
      to,
      subject: 'Reset your password',
      body: `Hi ${name},\n\nYou requested a password reset for your ${clinicName} account.\n\nClick the link below to set a new password:\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.\n\n— ${clinicName}`,
      html: `<p>Hi ${name},</p><p>You requested a password reset for your <strong>${clinicName}</strong> account.</p><p><a href="${resetLink}" style="background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p><p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p><p>— ${clinicName}</p>`,
      clinicId,
    });
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
    } else {
      // Direct send for user verification (no patient record)
      try {
        if (channel === 'sms') {
          await this.smsProvider.send({
            to: identifier,
            body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
            clinicId,
          });
        } else {
          await this.emailProvider.send({
            to: identifier,
            subject: 'Your Verification Code',
            body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
            clinicId,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to send OTP directly: ${err}`);
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

  // ─── Registration WhatsApp OTP ───

  async sendRegistrationOtp(phone: string): Promise<{ message: string }> {
    // Rate limit: max 3 sends per phone per hour
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const sends = (this.regOtpSendTracker.get(phone) ?? []).filter((t) => now - t < ONE_HOUR);
    if (sends.length >= 3) {
      throw new HttpException(
        'Too many OTP requests for this number. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    sends.push(now);
    this.regOtpSendTracker.set(phone, sends);

    // Block if this phone is already registered as a clinic owner
    const alreadyRegistered = await this.prisma.user.findFirst({
      where: { phone, role: 'SuperAdmin' },
      select: { id: true },
    });
    if (alreadyRegistered) {
      throw new ConflictException('A clinic is already registered with this number. Please sign in instead.');
    }

    // Capture lead — upsert so repeated OTP requests don't create duplicates
    await this.prisma.registrationLead.upsert({
      where: { phone },
      update: { updated_at: new Date() },
      create: { phone },
    }).catch(() => {
      // Non-fatal — lead capture failing should not block OTP delivery
    });

    const otp = String(randomInt(100000, 999999));
    const OTP_EXPIRY_MS = 10 * 60 * 1000;
    this.regOtpStore.set(phone, { code: otp, expiresAt: now + OTP_EXPIRY_MS, attempts: 0 });

    const smsApiKey = this.configService.get<string>('app.sms.apiKey');
    const smsDltTemplateId = this.configService.get<string>('app.sms.defaultDltTemplateId');
    const smsConfigured = !!(smsApiKey && smsDltTemplateId);

    const waAccessToken = this.configService.get<string>('app.whatsapp.accessToken');
    const waPhoneNumberId = this.configService.get<string>('app.whatsapp.phoneNumberId');
    const waConfigured = !!(waAccessToken && waPhoneNumberId);

    if (!smsConfigured && !waConfigured) {
      this.logger.warn('Neither SMS nor WhatsApp configured — registration OTP not sent');
      return { message: 'OTP generated (no channel configured on server).' };
    }

    let smsSent = false;
    let waSent = false;

    // Primary: SMS via SMSGatewayHub
    if (smsConfigured) {
      try {
        await this.sendRegistrationOtpViaSms(phone, otp);
        smsSent = true;
      } catch (err) {
        this.logger.warn(`SMS OTP failed, trying WhatsApp: ${(err as Error).message}`);
      }
    }

    // Secondary: WhatsApp (sent alongside SMS when both configured)
    if (waConfigured) {
      try {
        await this.sendRegistrationOtpViaWhatsApp(phone, otp);
        waSent = true;
      } catch (err) {
        this.logger.warn(`WhatsApp OTP failed: ${(err as Error).message}`);
      }
    }

    if (!smsSent && !waSent) {
      throw new BadRequestException('Failed to send OTP. Please check the number and try again.');
    }

    const channel = smsSent && waSent ? 'SMS and WhatsApp' : smsSent ? 'SMS' : 'WhatsApp';
    return { message: `OTP sent to your ${channel} number. Valid for 10 minutes.` };
  }

  private async sendRegistrationOtpViaSms(phone: string, otp: string): Promise<void> {
    const apiKey = this.configService.get<string>('app.sms.apiKey')!;
    const senderId = this.configService.get<string>('app.sms.senderId') || 'GRATSO';
    const entityId = this.configService.get<string>('app.sms.entityId') || '';
    const templateId = this.configService.get<string>('app.sms.defaultDltTemplateId')!;
    const templateBody =
      this.configService.get<string>('app.sms.dltTemplateBody') ||
      "Your otp for {#var#} by grats it is {#var#}, otp valid for 10min, please don't share with any one,";

    // Render: {#var#} slot 1 = purpose, slot 2 = OTP
    let slot = 0;
    const text = templateBody.replace(/\{#var#\}/g, () => {
      slot++;
      if (slot === 1) return 'Registration for Smart Dental Desk';
      if (slot === 2) return otp;
      return '';
    });

    // Normalize: 10-digit Indian number → 91XXXXXXXXXX
    const digits = phone.replace(/[^0-9]/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;

    const params = new URLSearchParams({
      APIKey: apiKey,
      senderid: senderId,
      channel: '2',
      DCS: '0',
      flashsms: '0',
      number,
      text,
      route: '47',
      dlttemplateid: templateId,
    });
    if (entityId) params.set('EntityId', entityId);

    const response = await fetch(
      `https://www.smsgatewayhub.com/api/mt/SendSMS?${params.toString()}`,
      { signal: AbortSignal.timeout(15000) },
    );

    const data = await response.json() as Record<string, unknown>;
    const ok = data['ErrorCode'] === '000' || data['ErrorCode'] === 0;

    if (ok) {
      this.logger.log(`Registration OTP sent via SMS to ${number}`);
    } else {
      const errMsg = String(data['ErrorMessage'] ?? 'SMS gateway error');
      this.logger.warn(`Registration OTP SMS failed to ${number}: ${errMsg}`);
      throw new BadRequestException(`Could not send SMS OTP: ${errMsg}`);
    }
  }

  private async sendRegistrationOtpViaWhatsApp(phone: string, otp: string): Promise<void> {
    const accessToken = this.configService.get<string>('app.whatsapp.accessToken')!;
    const phoneNumberId = this.configService.get<string>('app.whatsapp.phoneNumberId')!;

    // Normalize to Meta format: strip leading +
    const destination = phone.startsWith('+') ? phone.slice(1) : phone.replace(/[^0-9]/g, '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: destination,
      type: 'template',
      template: {
        name: 'registration_otp',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          },
          {
            // AUTHENTICATION templates auto-include a "Copy Code" button (index 0).
            // Meta requires the OTP to be passed here as well.
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: otp }],
          },
        ],
      },
    };

    const url = `${AuthService.META_GRAPH_API}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      const error = (data.error as Record<string, unknown> | undefined)?.message ?? 'Meta API error';
      this.logger.warn(`Registration OTP WhatsApp send failed to ${destination}: ${error}`);
      throw new BadRequestException(`Could not send WhatsApp OTP: ${error}`);
    }
    this.logger.log(`Registration OTP sent via WhatsApp to ${destination}`);
  }

  async verifyRegistrationOtp(phone: string, code: string): Promise<{ verified: boolean; token?: string; message: string }> {
    const entry = this.regOtpStore.get(phone);

    if (!entry) {
      return { verified: false, message: 'OTP not found or expired. Please request a new one.' };
    }
    if (Date.now() > entry.expiresAt) {
      this.regOtpStore.delete(phone);
      return { verified: false, message: 'OTP has expired. Please request a new one.' };
    }
    if (entry.attempts >= 3) {
      this.regOtpStore.delete(phone);
      return { verified: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Constant-time comparison
    const codeBuffer = Buffer.from(code);
    const storedBuffer = Buffer.from(entry.code);
    let diff = codeBuffer.length !== storedBuffer.length ? 1 : 0;
    const len = Math.min(codeBuffer.length, storedBuffer.length);
    for (let i = 0; i < len; i++) diff |= codeBuffer[i] ^ storedBuffer[i];

    if (diff !== 0) {
      entry.attempts++;
      return { verified: false, message: 'Invalid OTP.' };
    }

    // OTP valid — delete it and issue a 15-min verification JWT
    this.regOtpStore.delete(phone);
    const token = await this.jwtService.signAsync(
      { phone, type: 'phone_reg_verified' },
      { expiresIn: '15m' },
    );

    return { verified: true, token, message: 'Phone verified successfully.' };
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
