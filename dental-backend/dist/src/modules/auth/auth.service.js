"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const user_service_js_1 = require("../user/user.service.js");
const password_service_js_1 = require("../../common/services/password.service.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const audit_log_service_js_1 = require("../audit-log/audit-log.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const sms_provider_js_1 = require("../communication/providers/sms.provider.js");
const email_provider_js_1 = require("../communication/providers/email.provider.js");
const whatsapp_provider_js_1 = require("../communication/providers/whatsapp.provider.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const name_util_js_1 = require("../../common/utils/name.util.js");
const PLATFORM_CLINIC_ID = '__platform__';
let AuthService = class AuthService {
    static { AuthService_1 = this; }
    userService;
    passwordService;
    jwtService;
    configService;
    prisma;
    auditLogService;
    communicationService;
    smsProvider;
    emailProvider;
    whatsapp;
    logger = new common_1.Logger(AuthService_1.name);
    otpStore = new Map();
    regOtpStore = new Map();
    regOtpSendTracker = new Map();
    static META_GRAPH_API = 'https://graph.facebook.com/v21.0';
    constructor(userService, passwordService, jwtService, configService, prisma, auditLogService, communicationService, smsProvider, emailProvider, whatsapp) {
        this.userService = userService;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.prisma = prisma;
        this.auditLogService = auditLogService;
        this.communicationService = communicationService;
        this.smsProvider = smsProvider;
        this.emailProvider = emailProvider;
        this.whatsapp = whatsapp;
    }
    async signRefreshToken(userId, clinicId) {
        const payload = { sub: userId, type: 'refresh', clinic_id: clinicId };
        const expiresIn = this.configService.get('app.jwtRefreshExpiresIn', '90d');
        return this.jwtService.signAsync(payload, { expiresIn });
    }
    async lookup(dto) {
        const users = await this.prisma.user.findMany({
            where: { email: dto.email, status: 'active' },
            include: {
                clinic: { select: { id: true, name: true, email: true, subscription_status: true } },
            },
        });
        if (users.length === 0) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const validUsers = [];
        for (const user of users) {
            if (await this.passwordService.verify(dto.password, user.password_hash)) {
                validUsers.push(user);
            }
        }
        if (validUsers.length === 0) {
            throw new common_1.UnauthorizedException('Invalid email or password');
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
    async login(dto, req) {
        const user = await this.userService.findByEmail(dto.email, dto.clinic_id);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (user.status !== 'active') {
            throw new common_1.UnauthorizedException('Account is inactive');
        }
        const passwordValid = await this.passwordService.verify(dto.password, user.password_hash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: user.clinic_id },
            select: { is_suspended: true, subscription_status: true },
        });
        if (clinic?.is_suspended) {
            throw new common_1.ForbiddenException({
                code: 'ACCOUNT_SUSPENDED',
                message: 'Your account has been suspended. Please contact Smart Dental Desk support to reactivate.',
            });
        }
        if (clinic?.subscription_status === 'pending') {
            throw new common_1.ForbiddenException({
                code: 'PENDING_APPROVAL',
                message: 'Your account is pending approval. You will receive an email once our team has reviewed your application.',
            });
        }
        const payload = {
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
            .catch(() => { });
        return result;
    }
    async lookupByPhone(phone, password) {
        const users = await this.prisma.user.findMany({
            where: { phone, status: 'active', phone_verified: true },
            include: {
                clinic: { select: { id: true, name: true, email: true, subscription_status: true } },
            },
        });
        if (users.length === 0) {
            throw new common_1.UnauthorizedException('Invalid phone number or password');
        }
        const validUsers = [];
        for (const user of users) {
            if (await this.passwordService.verify(password, user.password_hash)) {
                validUsers.push(user);
            }
        }
        if (validUsers.length === 0) {
            throw new common_1.UnauthorizedException('Invalid phone number or password');
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
    async loginByPhone(phone, password, clinicId, req) {
        const user = await this.prisma.user.findFirst({
            where: { phone, clinic_id: clinicId, status: 'active', phone_verified: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid phone number or password');
        }
        const passwordValid = await this.passwordService.verify(password, user.password_hash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid phone number or password');
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: user.clinic_id },
            select: { is_suspended: true, subscription_status: true },
        });
        if (clinic?.is_suspended) {
            throw new common_1.ForbiddenException({
                code: 'ACCOUNT_SUSPENDED',
                message: 'Your account has been suspended. Please contact Smart Dental Desk support to reactivate.',
            });
        }
        if (clinic?.subscription_status === 'pending') {
            throw new common_1.ForbiddenException({
                code: 'PENDING_APPROVAL',
                message: 'Your account is pending approval. You will receive an email once our team has reviewed your application.',
            });
        }
        const payload = {
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
            .catch(() => { });
        return result;
    }
    async refresh(refreshToken) {
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(refreshToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (payload.type !== 'refresh') {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = await this.prisma.user.findFirst({
            where: { id: payload.sub, clinic_id: payload.clinic_id },
        });
        if (!user || user.status !== 'active') {
            throw new common_1.UnauthorizedException('Account is no longer active');
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: user.clinic_id },
            select: { is_suspended: true },
        });
        if (clinic?.is_suspended) {
            throw new common_1.ForbiddenException({
                code: 'ACCOUNT_SUSPENDED',
                message: 'Your account has been suspended. Please contact Smart Dental Desk support to reactivate.',
            });
        }
        const accessPayload = {
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
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const passwordValid = await this.passwordService.verify(dto.old_password, user.password_hash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Old password is incorrect');
        }
        const newHash = await this.passwordService.hash(dto.new_password);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password_hash: newHash },
        });
        return { message: 'Password changed successfully' };
    }
    async register(dto) {
        const PAID_TRIAL_DAYS = 14;
        const FREE_GRACE_DAYS = 30;
        try {
            const payload = await this.jwtService.verifyAsync(dto.phone_verification_token);
            if (payload.type !== 'phone_reg_verified') {
                throw new common_1.BadRequestException('Invalid phone verification token');
            }
            if (payload.phone !== dto.admin_phone) {
                throw new common_1.BadRequestException('Verified phone does not match the admin phone provided');
            }
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            throw new common_1.BadRequestException('Phone verification token is invalid or has expired. Please verify your WhatsApp number again.');
        }
        const existingClinic = await this.prisma.clinic.findFirst({
            where: { email: dto.clinic_email },
        });
        if (existingClinic) {
            throw new common_1.ConflictException('A clinic with this email already exists');
        }
        const existingPhoneUser = await this.prisma.user.findFirst({
            where: { phone: dto.admin_phone, role: 'SuperAdmin' },
        });
        if (existingPhoneUser) {
            throw new common_1.ConflictException('A clinic is already registered with this phone number. Please use a different number or sign in.');
        }
        let planId;
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
        const requireApproval = this.configService.get('REQUIRE_SIGNUP_APPROVAL') !== 'false';
        const subscriptionStatus = requireApproval ? 'pending' : (isFreePlan ? 'active' : 'trial');
        const result = await this.prisma.$transaction(async (tx) => {
            const clinic = await tx.clinic.create({
                data: {
                    name: (0, name_util_js_1.decodeHtmlEntities)(dto.clinic_name),
                    email: dto.clinic_email,
                    phone: dto.clinic_phone,
                    address: dto.address,
                    city: dto.city,
                    state: dto.state,
                    country: dto.country,
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
            const existingUser = await tx.user.findUnique({
                where: { email_clinic_id: { email: dto.admin_email, clinic_id: clinic.id } },
            });
            if (existingUser) {
                throw new common_1.ConflictException('A user with this email already exists');
            }
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
                    name: (0, name_util_js_1.decodeHtmlEntities)(dto.admin_name),
                    email: dto.admin_email,
                    phone: dto.admin_phone,
                    password_hash: await this.passwordService.hash(dto.admin_password),
                    role: 'SuperAdmin',
                    is_doctor: dto.is_doctor ?? false,
                    license_number: dto.is_doctor ? (dto.license_number ?? null) : null,
                    status: 'active',
                    phone_verified: true,
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
        this.sendOnboardingWelcomeEmail({
            admin_name: result.admin.name,
            admin_email: result.admin.email,
            admin_password: dto.admin_password,
            clinic_name: result.clinic.name,
            subscription_status: result.clinic.subscription_status,
            trial_ends_at: result.clinic.trial_ends_at,
        }).catch((err) => this.logger.warn(`Failed to send onboarding welcome email: ${err.message}`));
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
        }).catch((err) => this.logger.warn(`Failed to send onboarding admin alert email: ${err.message}`));
        this.sendSignupReceivedWhatsApp(dto.admin_phone, result.admin.name, result.clinic.name).catch((err) => this.logger.warn(`Failed to send signup received WhatsApp: ${err.message}`));
        this.sendSignupAdminAlertWhatsApp(result.clinic.name, result.admin.name, result.admin.email, dto.admin_phone).catch((err) => this.logger.warn(`Failed to send signup admin alert WhatsApp: ${err.message}`));
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
    async getClaimPreview(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                id: true, name: true, city: true, state: true, address: true,
                phone: true, email: true, is_directory_only: true,
                directory_approval_status: true,
                _count: { select: { users: true } },
            },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Listing not found');
        if (!clinic.is_directory_only)
            throw new common_1.BadRequestException('This clinic is already a full subscriber');
        if (clinic.directory_approval_status !== 'approved')
            throw new common_1.BadRequestException('This listing has not been approved yet');
        if (clinic._count.users > 0)
            throw new common_1.ConflictException('This listing has already been claimed');
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
    async claimDirectoryListing(dto) {
        let verifiedPhone;
        try {
            const payload = await this.jwtService.verifyAsync(dto.phone_verification_token);
            if (payload.type !== 'phone_reg_verified')
                throw new common_1.BadRequestException('Invalid phone verification token');
            verifiedPhone = payload.phone;
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            throw new common_1.BadRequestException('Phone verification token is invalid or expired. Please verify your number again.');
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: dto.clinic_id },
            include: { _count: { select: { users: true } } },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Listing not found');
        if (!clinic.is_directory_only)
            throw new common_1.BadRequestException('Already a full subscriber');
        if (clinic.directory_approval_status !== 'approved')
            throw new common_1.BadRequestException('Listing not yet approved');
        if (clinic._count.users > 0)
            throw new common_1.ConflictException('This listing has already been claimed');
        const existingEmail = await this.prisma.user.findFirst({ where: { email: dto.admin_email } });
        if (existingEmail)
            throw new common_1.ConflictException('An account with this email already exists');
        const FREE_GRACE = 30;
        const TRIAL_DAYS = 14;
        let planId;
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
                    name: (0, name_util_js_1.decodeHtmlEntities)(dto.admin_name),
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
    async sendOnboardingWelcomeEmail(data) {
        if (!this.ensurePlatformEmailConfigured())
            return;
        const frontendUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3001';
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
    async sendOnboardingAdminAlertEmail(data) {
        if (!this.ensurePlatformEmailConfigured())
            return;
        const frontendUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3001';
        const adminEmail = this.configService.get('app.adminEmail') || 'prasanthshanmugam10@gmail.com';
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
    ensurePlatformEmailConfigured() {
        if (this.emailProvider.isConfigured(PLATFORM_CLINIC_ID))
            return true;
        const host = this.configService.get('app.smtp.host');
        const user = this.configService.get('app.smtp.user');
        if (host && user) {
            this.emailProvider.configure(PLATFORM_CLINIC_ID, {
                host,
                port: this.configService.get('app.smtp.port') || 587,
                user,
                pass: this.configService.get('app.smtp.pass') || '',
                from: this.configService.get('app.smtp.from') || user,
                secure: this.configService.get('app.smtp.secure') || false,
            }, 'smtp-env');
            return true;
        }
        this.logger.warn('SMTP not configured — onboarding emails will be skipped');
        return false;
    }
    ensurePlatformWhatsAppConfigured() {
        if (this.whatsapp.isConfigured(PLATFORM_CLINIC_ID))
            return true;
        const accessToken = this.configService.get('app.whatsapp.accessToken');
        const phoneNumberId = this.configService.get('app.whatsapp.phoneNumberId');
        if (accessToken && phoneNumberId) {
            this.whatsapp.configure(PLATFORM_CLINIC_ID, {
                accessToken,
                phoneNumberId,
                wabaId: this.configService.get('app.whatsapp.wabaId') || '',
            }, 'meta-cloud-env');
            return true;
        }
        this.logger.warn('WhatsApp not configured — clinic-signup WhatsApp messages will be skipped');
        return false;
    }
    async sendSignupReceivedWhatsApp(phone, adminName, clinicName) {
        if (!phone || !this.ensurePlatformWhatsAppConfigured())
            return;
        await this.whatsapp.send({
            to: phone,
            body: `Hi ${adminName}, thank you for signing up ${clinicName} on Smart Dental Desk! Your application is under review.`,
            templateId: 'clinic_signup_received',
            variables: { '1': adminName, '2': clinicName },
            language: 'en',
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async sendSignupAdminAlertWhatsApp(clinicName, adminName, email, phone) {
        if (!this.ensurePlatformWhatsAppConfigured())
            return;
        const adminPhone = this.configService.get('app.adminWhatsappPhone', '916366767512');
        await this.whatsapp.send({
            to: adminPhone,
            body: `New clinic signup: ${clinicName} — ${adminName} (${email}, ${phone ?? 'no phone'})`,
            templateId: 'clinic_signup_admin_alert',
            variables: { '1': clinicName, '2': adminName, '3': email, '4': phone ?? 'Not provided' },
            language: 'en',
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async sendVerificationEmail(userId, clinicId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const token = await this.jwtService.signAsync({ sub: userId, type: 'email_verification', email: user.email }, { expiresIn: '24h' });
        const frontendUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3001';
        const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
        const template = await this.prisma.messageTemplate.findFirst({
            where: {
                template_name: 'Email Verification',
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
                const clinicName = (await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }))?.name || 'Smart Dental Desk';
                if (patient) {
                    await this.communicationService.sendMessage(clinicId, {
                        patient_id: patient.id,
                        channel: send_message_dto_js_1.MessageChannel.EMAIL,
                        category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                        template_id: template.id,
                        variables: {
                            user_name: user.name,
                            verification_link: verificationLink,
                            clinic_name: clinicName,
                        },
                    });
                }
                else {
                    await this.sendEmailDirect(clinicId, user.email, user.name, clinicName, verificationLink);
                }
            }
            catch (err) {
                this.logger.warn(`Failed to send verification email via CommunicationService: ${err}`);
            }
        }
        else {
            try {
                const clinicName = (await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }))?.name || 'Smart Dental Desk';
                await this.sendEmailDirect(clinicId, user.email, user.name, clinicName, verificationLink);
            }
            catch (err) {
                this.logger.warn(`Failed to send verification email directly: ${err}`);
            }
        }
        this.logger.log(`Verification email triggered for user ${userId}`);
        return { message: 'Verification email sent. Please check your inbox.' };
    }
    async verifyEmail(token) {
        try {
            const payload = await this.jwtService.verifyAsync(token);
            if (payload.type !== 'email_verification') {
                throw new common_1.BadRequestException('Invalid verification token');
            }
            await this.prisma.user.update({
                where: { id: payload.sub },
                data: { status: 'active', email_verified: true },
            });
            return { message: 'Email verified successfully' };
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired verification token');
        }
    }
    async verifyPhone(userId, clinicId, phone, code) {
        const result = await this.verifyOtp(phone, clinicId, code);
        if (result.valid) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { phone_verified: true, phone },
            });
        }
        return result;
    }
    async sendEmailDirect(clinicId, to, name, clinicName, verificationLink) {
        if (!this.emailProvider.isConfigured(clinicId)) {
            const host = this.configService.get('app.smtp.host');
            const user = this.configService.get('app.smtp.user');
            if (host && user) {
                this.emailProvider.configure(clinicId, {
                    host,
                    port: this.configService.get('app.smtp.port') || 587,
                    user,
                    pass: this.configService.get('app.smtp.pass') || '',
                    from: this.configService.get('app.smtp.from') || user,
                    secure: this.configService.get('app.smtp.secure') || false,
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
    async requestPasswordReset(email, clinicId) {
        const frontendUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3001';
        const SAFE_RESPONSE = { message: 'If an account exists with this email, a password reset link has been sent.' };
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
            const token = await this.jwtService.signAsync({ sub: user.id, type: 'password_reset', email: user.email }, { expiresIn: '1h' });
            const resetLink = `${frontendUrl}/reset-password?token=${token}`;
            const template = await this.prisma.messageTemplate.findFirst({
                where: {
                    template_name: 'Password Reset',
                    channel: { in: ['email', 'all'] },
                    is_active: true,
                    OR: [{ clinic_id: cid }, { clinic_id: null }],
                },
                orderBy: { clinic_id: 'desc' },
            });
            const clinicName = (await this.prisma.clinic.findUnique({ where: { id: cid }, select: { name: true } }))?.name ||
                'Smart Dental Desk';
            try {
                if (template) {
                    const patient = await this.prisma.patient.findFirst({
                        where: { clinic_id: cid, email: user.email },
                    });
                    if (patient) {
                        await this.communicationService.sendMessage(cid, {
                            patient_id: patient.id,
                            channel: send_message_dto_js_1.MessageChannel.EMAIL,
                            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                            template_id: template.id,
                            variables: { user_name: user.name, reset_link: resetLink, clinic_name: clinicName },
                        });
                    }
                    else {
                        await this.sendPasswordResetEmailDirect(cid, user.email, user.name, clinicName, resetLink);
                    }
                }
                else {
                    await this.sendPasswordResetEmailDirect(cid, user.email, user.name, clinicName, resetLink);
                }
            }
            catch (err) {
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
                .catch(() => { });
        }
        return SAFE_RESPONSE;
    }
    async sendPasswordResetEmailDirect(clinicId, to, name, clinicName, resetLink) {
        if (!this.emailProvider.isConfigured(clinicId)) {
            const host = this.configService.get('app.smtp.host');
            const user = this.configService.get('app.smtp.user');
            if (host && user) {
                this.emailProvider.configure(clinicId, {
                    host,
                    port: this.configService.get('app.smtp.port') || 587,
                    user,
                    pass: this.configService.get('app.smtp.pass') || '',
                    from: this.configService.get('app.smtp.from') || user,
                    secure: this.configService.get('app.smtp.secure') || false,
                }, 'smtp-env');
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
    async resetPassword(token, newPassword) {
        try {
            const payload = await this.jwtService.verifyAsync(token);
            if (payload.type !== 'password_reset') {
                throw new common_1.BadRequestException('Invalid reset token');
            }
            const newHash = await this.passwordService.hash(newPassword);
            await this.prisma.user.update({
                where: { id: payload.sub },
                data: { password_hash: newHash },
            });
            return { message: 'Password reset successfully. You can now log in with your new password.' };
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
    }
    async sendOtp(identifier, clinicId, channel = 'sms') {
        const otp = String((0, crypto_1.randomInt)(100000, 999999));
        const OTP_EXPIRY_MS = 10 * 60 * 1000;
        const key = `${clinicId}:${identifier}`;
        this.otpStore.set(key, {
            code: otp,
            expiresAt: Date.now() + OTP_EXPIRY_MS,
            attempts: 0,
        });
        this.cleanExpiredOtps();
        const template = await this.prisma.messageTemplate.findFirst({
            where: {
                template_name: 'OTP Verification',
                is_active: true,
                OR: [{ clinic_id: clinicId }, { clinic_id: null }],
            },
            orderBy: { clinic_id: 'desc' },
        });
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
                    channel: channel === 'sms' ? send_message_dto_js_1.MessageChannel.SMS : send_message_dto_js_1.MessageChannel.EMAIL,
                    category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                    template_id: template.id,
                    variables: { otp_code: otp },
                });
            }
            catch (err) {
                this.logger.warn(`Failed to send OTP via CommunicationService: ${err}`);
            }
        }
        else {
            try {
                if (channel === 'sms') {
                    await this.smsProvider.send({
                        to: identifier,
                        body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
                        clinicId,
                    });
                }
                else {
                    await this.emailProvider.send({
                        to: identifier,
                        subject: 'Your Verification Code',
                        body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
                        clinicId,
                    });
                }
            }
            catch (err) {
                this.logger.warn(`Failed to send OTP directly: ${err}`);
            }
        }
        this.logger.log(`OTP generated for ${identifier} on ${channel}`);
        return { message: `OTP sent to ${channel === 'sms' ? 'phone' : 'email'}. Valid for 10 minutes.` };
    }
    async verifyOtp(identifier, clinicId, code) {
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
        this.otpStore.delete(key);
        return { valid: true, message: 'OTP verified successfully.' };
    }
    async sendRegistrationOtp(phone) {
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        const sends = (this.regOtpSendTracker.get(phone) ?? []).filter((t) => now - t < ONE_HOUR);
        if (sends.length >= 3) {
            throw new common_1.HttpException('Too many OTP requests for this number. Please wait before trying again.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        sends.push(now);
        this.regOtpSendTracker.set(phone, sends);
        const alreadyRegistered = await this.prisma.user.findFirst({
            where: { phone, role: 'SuperAdmin' },
            select: { id: true },
        });
        if (alreadyRegistered) {
            throw new common_1.ConflictException('A clinic is already registered with this number. Please sign in instead.');
        }
        await this.prisma.registrationLead.upsert({
            where: { phone },
            update: { updated_at: new Date() },
            create: { phone },
        }).catch(() => {
        });
        const otp = String((0, crypto_1.randomInt)(100000, 999999));
        const OTP_EXPIRY_MS = 10 * 60 * 1000;
        this.regOtpStore.set(phone, { code: otp, expiresAt: now + OTP_EXPIRY_MS, attempts: 0 });
        const smsApiKey = this.configService.get('app.sms.apiKey');
        const smsDltTemplateId = this.configService.get('app.sms.defaultDltTemplateId');
        const smsConfigured = !!(smsApiKey && smsDltTemplateId);
        const waAccessToken = this.configService.get('app.whatsapp.accessToken');
        const waPhoneNumberId = this.configService.get('app.whatsapp.phoneNumberId');
        const waConfigured = !!(waAccessToken && waPhoneNumberId);
        if (!smsConfigured && !waConfigured) {
            this.logger.warn('Neither SMS nor WhatsApp configured — registration OTP not sent');
            return { message: 'OTP generated (no channel configured on server).' };
        }
        let smsSent = false;
        let waSent = false;
        if (smsConfigured) {
            try {
                await this.sendRegistrationOtpViaSms(phone, otp);
                smsSent = true;
            }
            catch (err) {
                this.logger.warn(`SMS OTP failed, trying WhatsApp: ${err.message}`);
            }
        }
        if (waConfigured) {
            try {
                await this.sendRegistrationOtpViaWhatsApp(phone, otp);
                waSent = true;
            }
            catch (err) {
                this.logger.warn(`WhatsApp OTP failed: ${err.message}`);
            }
        }
        if (!smsSent && !waSent) {
            throw new common_1.BadRequestException('Failed to send OTP. Please check the number and try again.');
        }
        const channel = smsSent && waSent ? 'SMS and WhatsApp' : smsSent ? 'SMS' : 'WhatsApp';
        return { message: `OTP sent to your ${channel} number. Valid for 10 minutes.` };
    }
    async sendRegistrationOtpViaSms(phone, otp) {
        const apiKey = this.configService.get('app.sms.apiKey');
        const senderId = this.configService.get('app.sms.senderId') || 'GRATSO';
        const entityId = this.configService.get('app.sms.entityId') || '';
        const templateId = this.configService.get('app.sms.defaultDltTemplateId');
        const templateBody = this.configService.get('app.sms.dltTemplateBody') ||
            "Your otp for {#var#} by grats it is {#var#}, otp valid for 10min, please don't share with any one,";
        let slot = 0;
        const text = templateBody.replace(/\{#var#\}/g, () => {
            slot++;
            if (slot === 1)
                return 'Registration for Smart Dental Desk';
            if (slot === 2)
                return otp;
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
        if (entityId)
            params.set('EntityId', entityId);
        const response = await fetch(`https://www.smsgatewayhub.com/api/mt/SendSMS?${params.toString()}`, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        const ok = data['ErrorCode'] === '000' || data['ErrorCode'] === 0;
        if (ok) {
            this.logger.log(`Registration OTP sent via SMS to ${number}`);
        }
        else {
            const errMsg = String(data['ErrorMessage'] ?? 'SMS gateway error');
            this.logger.warn(`Registration OTP SMS failed to ${number}: ${errMsg}`);
            throw new common_1.BadRequestException(`Could not send SMS OTP: ${errMsg}`);
        }
    }
    async sendRegistrationOtpViaWhatsApp(phone, otp) {
        const accessToken = this.configService.get('app.whatsapp.accessToken');
        const phoneNumberId = this.configService.get('app.whatsapp.phoneNumberId');
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
                        type: 'button',
                        sub_type: 'url',
                        index: '0',
                        parameters: [{ type: 'text', text: otp }],
                    },
                ],
            },
        };
        const url = `${AuthService_1.META_GRAPH_API}/${phoneNumberId}/messages`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
        });
        const data = await response.json();
        if (!response.ok) {
            const error = data.error?.message ?? 'Meta API error';
            this.logger.warn(`Registration OTP WhatsApp send failed to ${destination}: ${error}`);
            throw new common_1.BadRequestException(`Could not send WhatsApp OTP: ${error}`);
        }
        this.logger.log(`Registration OTP sent via WhatsApp to ${destination}`);
    }
    async verifyRegistrationOtp(phone, code) {
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
        const codeBuffer = Buffer.from(code);
        const storedBuffer = Buffer.from(entry.code);
        let diff = codeBuffer.length !== storedBuffer.length ? 1 : 0;
        const len = Math.min(codeBuffer.length, storedBuffer.length);
        for (let i = 0; i < len; i++)
            diff |= codeBuffer[i] ^ storedBuffer[i];
        if (diff !== 0) {
            entry.attempts++;
            return { verified: false, message: 'Invalid OTP.' };
        }
        this.regOtpStore.delete(phone);
        const token = await this.jwtService.signAsync({ phone, type: 'phone_reg_verified' }, { expiresIn: '15m' });
        return { verified: true, token, message: 'Phone verified successfully.' };
    }
    cleanExpiredOtps() {
        const now = Date.now();
        for (const [key, entry] of this.otpStore) {
            if (now > entry.expiresAt) {
                this.otpStore.delete(key);
            }
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_js_1.UserService,
        password_service_js_1.PasswordService,
        jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_js_1.PrismaService,
        audit_log_service_js_1.AuditLogService,
        communication_service_js_1.CommunicationService,
        sms_provider_js_1.SmsProvider,
        email_provider_js_1.EmailProvider,
        whatsapp_provider_js_1.WhatsAppProvider])
], AuthService);
//# sourceMappingURL=auth.service.js.map