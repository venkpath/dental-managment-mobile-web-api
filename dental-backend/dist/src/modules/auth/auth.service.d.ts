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
    constructor(userService: UserService, passwordService: PasswordService, jwtService: JwtService, configService: ConfigService, prisma: PrismaService, auditLogService: AuditLogService, communicationService: CommunicationService, smsProvider: SmsProvider, emailProvider: EmailProvider);
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
    private cleanExpiredOtps;
}
