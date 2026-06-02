import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserService } from '../user/user.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { SmsProvider } from '../communication/providers/sms.provider.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { LoginDto, LookupDto, RegisterClinicDto, ChangePasswordDto } from './dto/index.js';
export interface RefreshResponse {
    access_token: string;
    refresh_token: string;
}
export interface LoginResponse {
    access_token: string;
    refresh_token: string;
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
export declare class AuthService {
    private readonly userService;
    private readonly passwordService;
    private readonly jwtService;
    private readonly configService;
    private readonly prisma;
    private readonly auditLogService;
    private readonly communicationService;
    private readonly smsProvider;
    private readonly emailProvider;
    private readonly logger;
    private readonly otpStore;
    private readonly regOtpStore;
    private readonly regOtpSendTracker;
    private static readonly META_GRAPH_API;
    constructor(userService: UserService, passwordService: PasswordService, jwtService: JwtService, configService: ConfigService, prisma: PrismaService, auditLogService: AuditLogService, communicationService: CommunicationService, smsProvider: SmsProvider, emailProvider: EmailProvider);
    private signRefreshToken;
    lookup(dto: LookupDto): Promise<{
        clinics: {
            clinic_id: string;
            clinic_name: string;
            clinic_email: string;
            subscription_status: string;
            role: string;
        }[];
        requires_clinic_selection: boolean;
    }>;
    login(dto: LoginDto, req?: Request): Promise<LoginResponse>;
    lookupByPhone(phone: string, password: string): Promise<{
        clinics: {
            clinic_id: string;
            clinic_name: string;
            clinic_email: string;
            subscription_status: string;
            role: string;
        }[];
        requires_clinic_selection: boolean;
    }>;
    loginByPhone(phone: string, password: string, clinicId: string, req?: Request): Promise<LoginResponse>;
    refresh(refreshToken: string): Promise<RefreshResponse>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    register(dto: RegisterClinicDto): Promise<{
        clinic: {
            id: string;
            name: string;
            email: string;
            subscription_status: string;
            trial_ends_at: Date | null;
            plan_id: string | null;
        };
        admin: {
            id: string;
            email: string;
            name: string;
            status: string;
            created_at: Date;
            clinic_id: string;
            role: string;
            branch_id: string | null;
        };
    }>;
    getClaimPreview(clinicId: string): Promise<{
        id: string;
        name: string;
        city: string | null;
        state: string | null;
        address: string | null;
        phone: string | null;
        email: string;
    }>;
    claimDirectoryListing(dto: {
        clinic_id: string;
        admin_name: string;
        admin_email: string;
        admin_password: string;
        phone_verification_token: string;
        is_doctor?: boolean;
        plan_key?: string;
        billing_cycle?: string;
    }): Promise<{
        clinic: {
            id: string;
            name: string;
            email: string;
            subscription_status: string;
            trial_ends_at: Date | null;
        };
        admin: {
            id: string;
            email: string;
            name: string;
            status: string;
            clinic_id: string;
            role: string;
            branch_id: string | null;
        };
    }>;
    private sendOnboardingWelcomeEmail;
    private sendOnboardingAdminAlertEmail;
    private ensurePlatformEmailConfigured;
    sendVerificationEmail(userId: string, clinicId: string): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    verifyPhone(userId: string, clinicId: string, phone: string, code: string): Promise<{
        valid: boolean;
        message: string;
    }>;
    private sendEmailDirect;
    requestPasswordReset(email: string, clinicId?: string): Promise<{
        message: string;
    }>;
    private sendPasswordResetEmailDirect;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    sendOtp(identifier: string, clinicId: string, channel?: 'sms' | 'email'): Promise<{
        message: string;
    }>;
    verifyOtp(identifier: string, clinicId: string, code: string): Promise<{
        valid: boolean;
        message: string;
    }>;
    sendRegistrationOtp(phone: string): Promise<{
        message: string;
    }>;
    private sendRegistrationOtpViaSms;
    private sendRegistrationOtpViaWhatsApp;
    verifyRegistrationOtp(phone: string, code: string): Promise<{
        verified: boolean;
        token?: string;
        message: string;
    }>;
    private cleanExpiredOtps;
}
