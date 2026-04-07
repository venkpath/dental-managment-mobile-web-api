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
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
let AuthService = AuthService_1 = class AuthService {
    userService;
    passwordService;
    jwtService;
    configService;
    prisma;
    auditLogService;
    communicationService;
    smsProvider;
    emailProvider;
    logger = new common_1.Logger(AuthService_1.name);
    otpStore = new Map();
    constructor(userService, passwordService, jwtService, configService, prisma, auditLogService, communicationService, smsProvider, emailProvider) {
        this.userService = userService;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.prisma = prisma;
        this.auditLogService = auditLogService;
        this.communicationService = communicationService;
        this.smsProvider = smsProvider;
        this.emailProvider = emailProvider;
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
        const TRIAL_DAYS = 14;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
        const existingClinic = await this.prisma.clinic.findFirst({
            where: { email: dto.clinic_email },
        });
        if (existingClinic) {
            throw new common_1.ConflictException('A clinic with this email already exists');
        }
        let planId;
        if (dto.plan_key && dto.plan_key !== 'trial') {
            const plan = await this.prisma.plan.findFirst({
                where: { name: { contains: dto.plan_key, mode: 'insensitive' } },
            });
            if (plan)
                planId = plan.id;
        }
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
                    subscription_status: 'trial',
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
                plan_id: result.clinic.plan_id,
            },
            admin: result.admin,
        };
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
                if (patient) {
                    await this.communicationService.sendMessage(clinicId, {
                        patient_id: patient.id,
                        channel: send_message_dto_js_1.MessageChannel.EMAIL,
                        category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                        template_id: template.id,
                        variables: {
                            user_name: user.name,
                            verification_link: verificationLink,
                            clinic_name: (await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }))?.name || 'Smart Dental Desk',
                        },
                    });
                }
            }
            catch (err) {
                this.logger.warn(`Failed to send verification email via CommunicationService: ${err}`);
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
    async requestPasswordReset(email, clinicId) {
        const user = await this.userService.findByEmail(email, clinicId);
        if (!user) {
            return { message: 'If an account exists with this email, a password reset link has been sent.' };
        }
        const token = await this.jwtService.signAsync({ sub: user.id, type: 'password_reset', email: user.email }, { expiresIn: '1h' });
        const frontendUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3001';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;
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
                        channel: send_message_dto_js_1.MessageChannel.EMAIL,
                        category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                        template_id: template.id,
                        variables: {
                            user_name: user.name,
                            reset_link: resetLink,
                            clinic_name: (await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }))?.name || 'Smart Dental Desk',
                        },
                    });
                }
            }
            catch (err) {
                this.logger.warn(`Failed to send password reset email: ${err}`);
            }
        }
        await this.auditLogService.log({
            clinic_id: clinicId,
            user_id: user.id,
            action: 'password_reset_requested',
            entity: 'auth',
            entity_id: user.id,
        }).catch(() => { });
        return { message: 'If an account exists with this email, a password reset link has been sent.' };
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
        email_provider_js_1.EmailProvider])
], AuthService);
//# sourceMappingURL=auth.service.js.map