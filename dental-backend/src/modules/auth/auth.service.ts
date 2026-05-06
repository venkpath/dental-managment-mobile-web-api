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
import { SmsProvider } from '../communication/providers/sms.provider.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { LoginDto, LookupDto, RegisterClinicDto, ChangePasswordDto } from './dto/index.js';

/** Synthetic clinic ID used to configure the platform-level SMTP transporter */
const PLATFORM_CLINIC_ID = '__platform__';

export interface LoginResponse {
  access_token: string;
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
    private readonly smsProvider: SmsProvider,
    private readonly emailProvider: EmailProvider,
  ) {}

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
    const PAID_TRIAL_DAYS = 14;
    const FREE_GRACE_DAYS = 30;

    // Check if clinic email already exists
    const existingClinic = await this.prisma.clinic.findFirst({
      where: { email: dto.clinic_email },
    });
    if (existingClinic) {
      throw new ConflictException('A clinic with this email already exists');
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
    const subscriptionStatus = isFreePlan ? 'active' : 'trial';

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
          country: dto.country,
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
          name: dto.admin_name,
          email: dto.admin_email,
          phone: dto.admin_phone,
          password_hash: await this.passwordService.hash(dto.admin_password),
          role: 'SuperAdmin',
          is_doctor: dto.is_doctor ?? false,
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

  private cleanExpiredOtps(): void {
    const now = Date.now();
    for (const [key, entry] of this.otpStore) {
      if (now > entry.expiresAt) {
        this.otpStore.delete(key);
      }
    }
  }
}
