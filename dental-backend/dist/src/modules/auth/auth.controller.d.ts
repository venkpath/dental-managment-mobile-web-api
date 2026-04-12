import type { Request, Response } from 'express';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { AuthService } from './auth.service.js';
import { LoginDto, LookupDto, RegisterClinicDto, ChangePasswordDto } from './dto/index.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    login(dto: LoginDto, req: Request, res: Response): Promise<import("./auth.service.js").LoginResponse>;
    changePassword(user: JwtPayload, dto: ChangePasswordDto): Promise<{
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
    sendVerificationEmail(user: JwtPayload): Promise<{
        message: string;
    }>;
    verifyEmail(body: {
        token: string;
    }): Promise<{
        message: string;
    }>;
    forgotPassword(body: {
        email: string;
        clinic_id?: string;
    }): Promise<{
        message: string;
    }>;
    resetPassword(body: {
        token: string;
        new_password: string;
    }): Promise<{
        message: string;
    }>;
    sendPhoneOtp(user: JwtPayload, body: {
        phone: string;
    }): Promise<{
        message: string;
    }>;
    verifyPhone(user: JwtPayload, body: {
        phone: string;
        code: string;
    }): Promise<{
        valid: boolean;
        message: string;
    }>;
    sendOtp(body: {
        identifier: string;
        clinic_id: string;
        channel?: 'sms' | 'email';
    }): Promise<{
        message: string;
    }>;
    verifyOtp(body: {
        identifier: string;
        clinic_id: string;
        code: string;
    }): Promise<{
        valid: boolean;
        message: string;
    }>;
}
