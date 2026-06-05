import type { Request, Response } from 'express';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { AuthService } from './auth.service.js';
import { LoginDto, LookupDto, LookupByPhoneDto, LoginByPhoneDto, RegisterClinicDto, ChangePasswordDto, RefreshTokenDto } from './dto/index.js';
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
    lookupByPhone(dto: LookupByPhoneDto): Promise<{
        clinics: {
            clinic_id: string;
            clinic_name: string;
            clinic_email: string;
            subscription_status: string;
            role: string;
        }[];
        requires_clinic_selection: boolean;
    }>;
    loginByPhone(dto: LoginByPhoneDto, req: Request, res: Response): Promise<import("./auth.service.js").LoginResponse>;
    refresh(dto: RefreshTokenDto, res: Response): Promise<import("./auth.service.js").RefreshResponse>;
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
    getClaimPreview(clinicId: string): Promise<{
        id: string;
        name: string;
        city: string | null;
        state: string | null;
        address: string | null;
        phone: string | null;
        email: string;
    }>;
    claimDirectoryListing(body: {
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
    sendRegistrationOtp(body: {
        phone: string;
    }): Promise<{
        message: string;
    }>;
    verifyRegistrationOtp(body: {
        phone: string;
        code: string;
    }): Promise<{
        verified: boolean;
        token?: string;
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
    sendLoginOtp(body: {
        identifier: string;
    }): Promise<{
        message: string;
    }>;
    loginWithOtp(body: {
        identifier: string;
        code: string;
        clinic_id?: string;
    }, req: Request, res: Response): Promise<import("./auth.service.js").LoginResponse | {
        requires_clinic_selection: true;
        clinics: {
            clinic_id: string;
            clinic_name: string;
            clinic_email: string;
            subscription_status: string;
            role: string;
        }[];
    }>;
    setInitialPassword(user: JwtPayload, body: {
        new_password: string;
    }): Promise<{
        message: string;
    }>;
}
