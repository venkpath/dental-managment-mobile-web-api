import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { CreateSuperAdminDto } from './dto/index.js';
import { SuperAdmin } from '@prisma/client';
export declare class SuperAdminService {
    private readonly prisma;
    private readonly passwordService;
    constructor(prisma: PrismaService, passwordService: PasswordService);
    create(dto: CreateSuperAdminDto): Promise<Omit<SuperAdmin, 'password_hash'>>;
    findByEmail(email: string): Promise<SuperAdmin | null>;
    findOne(id: string): Promise<Omit<SuperAdmin, 'password_hash'>>;
    getDashboardStats(): Promise<{
        total_clinics: number;
        active_clinics: number;
        trial_clinics: number;
        expired_clinics: number;
        total_plans: number;
        total_features: number;
        total_patients: number;
        total_appointments: number;
        estimated_monthly_revenue: number;
        recent_clinics: ({
            plan: {
                name: string;
            } | null;
        } & {
            id: string;
            email: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            plan_id: string | null;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            subscription_status: string;
            subscription_id: string | null;
            trial_ends_at: Date | null;
            ai_usage_count: number;
            ai_quota_override: number | null;
        })[];
    }>;
    listClinics(params: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            plan: {
                id: string;
                name: string;
                price_monthly: import("@prisma/client-runtime-utils").Decimal;
            } | null;
            _count: {
                users: number;
                branches: number;
                patients: number;
            };
        } & {
            id: string;
            email: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            plan_id: string | null;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            subscription_status: string;
            subscription_id: string | null;
            trial_ends_at: Date | null;
            ai_usage_count: number;
            ai_quota_override: number | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getClinicDetail(id: string): Promise<{
        plan: ({
            plan_features: ({
                feature: {
                    id: string;
                    created_at: Date;
                    key: string;
                    description: string;
                };
            } & {
                id: string;
                plan_id: string;
                feature_id: string;
                is_enabled: boolean;
            })[];
        } & {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            price_monthly: import("@prisma/client-runtime-utils").Decimal;
            max_branches: number;
            max_staff: number;
            ai_quota: number;
            razorpay_plan_id: string | null;
        }) | null;
        _count: {
            patients: number;
            appointments: number;
            invoices: number;
        };
        users: {
            id: string;
            email: string;
            name: string;
            status: string;
            created_at: Date;
            role: string;
        }[];
        branches: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            working_start_time: string | null;
            working_end_time: string | null;
            lunch_start_time: string | null;
            lunch_end_time: string | null;
            slot_duration: number | null;
            default_appt_duration: number | null;
            buffer_minutes: number | null;
            advance_booking_days: number | null;
            working_days: string | null;
            clinic_id: string;
        }[];
    } & {
        id: string;
        email: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        plan_id: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        subscription_status: string;
        subscription_id: string | null;
        trial_ends_at: Date | null;
        ai_usage_count: number;
        ai_quota_override: number | null;
    }>;
    onboardClinic(dto: {
        clinic_name: string;
        clinic_email: string;
        clinic_phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        admin_name: string;
        admin_email: string;
        admin_password: string;
        plan_id?: string;
    }): Promise<{
        clinic: {
            id: string;
            email: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            plan_id: string | null;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            subscription_status: string;
            subscription_id: string | null;
            trial_ends_at: Date | null;
            ai_usage_count: number;
            ai_quota_override: number | null;
        };
        branch: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            working_start_time: string | null;
            working_end_time: string | null;
            lunch_start_time: string | null;
            lunch_end_time: string | null;
            slot_duration: number | null;
            default_appt_duration: number | null;
            buffer_minutes: number | null;
            advance_booking_days: number | null;
            working_days: string | null;
            clinic_id: string;
        };
        admin: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
    }>;
    deleteClinic(id: string): Promise<{
        deleted: boolean;
        clinic_name: string;
    }>;
    changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    getAuditLogs(params: {
        page: number;
        limit: number;
        clinicId?: string;
        action?: string;
    }): Promise<{
        data: {
            id: string;
            created_at: Date;
            clinic_id: string;
            entity: string;
            entity_id: string;
            action: string;
            user_id: string | null;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getGlobalSettings(): Promise<{
        [k: string]: string;
    }>;
    updateGlobalSetting(key: string, value: string): Promise<{
        updated_at: Date;
        key: string;
        value: string;
    }>;
    updateClinicAiQuota(clinicId: string, quota: number | null): Promise<{
        id: string;
        name: string;
        ai_usage_count: number;
        ai_quota_override: number | null;
    }>;
    resetClinicAiUsage(clinicId: string): Promise<{
        id: string;
        name: string;
        ai_usage_count: number;
    }>;
}
