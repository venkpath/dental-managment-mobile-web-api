import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { CreateSuperAdminDto } from './dto/index.js';
import { SuperAdmin } from '@prisma/client';
export declare class SuperAdminService {
    private readonly prisma;
    private readonly passwordService;
    private readonly emailProvider;
    private readonly config;
    private readonly logger;
    private readonly adminEmail;
    private readonly frontendUrl;
    constructor(prisma: PrismaService, passwordService: PasswordService, emailProvider: EmailProvider, config: ConfigService);
    private ensureEmailConfigured;
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
            pincode: string | null;
            subscription_status: string;
            subscription_id: string | null;
            billing_cycle: string;
            trial_ends_at: Date | null;
            next_billing_at: Date | null;
            is_complimentary: boolean;
            has_own_waba: boolean;
            logo_url: string | null;
            currency_code: string;
            ai_usage_count: number;
            ai_quota_override: number | null;
            custom_patient_limit: number | null;
            custom_appointment_limit: number | null;
            custom_invoice_limit: number | null;
            custom_treatment_limit: number | null;
            custom_prescription_limit: number | null;
            custom_consultation_limit: number | null;
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
            pincode: string | null;
            subscription_status: string;
            subscription_id: string | null;
            billing_cycle: string;
            trial_ends_at: Date | null;
            next_billing_at: Date | null;
            is_complimentary: boolean;
            has_own_waba: boolean;
            logo_url: string | null;
            currency_code: string;
            ai_usage_count: number;
            ai_quota_override: number | null;
            custom_patient_limit: number | null;
            custom_appointment_limit: number | null;
            custom_invoice_limit: number | null;
            custom_treatment_limit: number | null;
            custom_prescription_limit: number | null;
            custom_consultation_limit: number | null;
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
            max_invoices_per_month: number | null;
            price_monthly: import("@prisma/client-runtime-utils").Decimal;
            price_yearly: import("@prisma/client-runtime-utils").Decimal | null;
            max_branches: number;
            max_staff: number;
            ai_quota: number;
            ai_overage_cap: number;
            max_patients_per_month: number | null;
            max_appointments_per_month: number | null;
            max_treatments_per_month: number | null;
            max_prescriptions_per_month: number | null;
            max_consultations_per_month: number | null;
            whatsapp_included_monthly: number | null;
            whatsapp_hard_limit_monthly: number | null;
            allow_whatsapp_overage_billing: boolean;
            razorpay_plan_id: string | null;
            razorpay_plan_id_yearly: string | null;
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
            pincode: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            book_now_url: string | null;
            working_start_time: string | null;
            working_end_time: string | null;
            lunch_start_time: string | null;
            lunch_end_time: string | null;
            slot_duration: number | null;
            default_appt_duration: number | null;
            buffer_minutes: number | null;
            advance_booking_days: number | null;
            working_days: string | null;
            prescription_template_url: string | null;
            prescription_template_config: import("@prisma/client/runtime/client").JsonValue | null;
            prescription_template_enabled: boolean;
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
        pincode: string | null;
        subscription_status: string;
        subscription_id: string | null;
        billing_cycle: string;
        trial_ends_at: Date | null;
        next_billing_at: Date | null;
        is_complimentary: boolean;
        has_own_waba: boolean;
        logo_url: string | null;
        currency_code: string;
        ai_usage_count: number;
        ai_quota_override: number | null;
        custom_patient_limit: number | null;
        custom_appointment_limit: number | null;
        custom_invoice_limit: number | null;
        custom_treatment_limit: number | null;
        custom_prescription_limit: number | null;
        custom_consultation_limit: number | null;
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
        billing_cycle?: 'monthly' | 'yearly';
        has_own_waba?: boolean;
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
            pincode: string | null;
            subscription_status: string;
            subscription_id: string | null;
            billing_cycle: string;
            trial_ends_at: Date | null;
            next_billing_at: Date | null;
            is_complimentary: boolean;
            has_own_waba: boolean;
            logo_url: string | null;
            currency_code: string;
            ai_usage_count: number;
            ai_quota_override: number | null;
            custom_patient_limit: number | null;
            custom_appointment_limit: number | null;
            custom_invoice_limit: number | null;
            custom_treatment_limit: number | null;
            custom_prescription_limit: number | null;
            custom_consultation_limit: number | null;
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
            pincode: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            book_now_url: string | null;
            working_start_time: string | null;
            working_end_time: string | null;
            lunch_start_time: string | null;
            lunch_end_time: string | null;
            slot_duration: number | null;
            default_appt_duration: number | null;
            buffer_minutes: number | null;
            advance_booking_days: number | null;
            working_days: string | null;
            prescription_template_url: string | null;
            prescription_template_config: import("@prisma/client/runtime/client").JsonValue | null;
            prescription_template_enabled: boolean;
            clinic_id: string;
        };
        admin: {
            id: string;
            email: string;
            name: string;
            role: string;
        };
    }>;
    private sendOnboardingWelcomeEmail;
    private sendOnboardingAdminAlertEmail;
    deleteClinic(id: string): Promise<{
        deleted: boolean;
        clinic_name: string;
    }>;
    updateClinicLimits(clinicId: string, dto: {
        custom_patient_limit?: number | null;
        custom_appointment_limit?: number | null;
        custom_invoice_limit?: number | null;
        custom_treatment_limit?: number | null;
        custom_prescription_limit?: number | null;
        custom_consultation_limit?: number | null;
    }): Promise<{
        id: string;
        name: string;
        plan: {
            name: string;
            max_invoices_per_month: number | null;
            max_patients_per_month: number | null;
            max_appointments_per_month: number | null;
            max_treatments_per_month: number | null;
            max_prescriptions_per_month: number | null;
            max_consultations_per_month: number | null;
        } | null;
        custom_patient_limit: number | null;
        custom_appointment_limit: number | null;
        custom_invoice_limit: number | null;
        custom_treatment_limit: number | null;
        custom_prescription_limit: number | null;
        custom_consultation_limit: number | null;
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
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            entity: string;
            entity_id: string;
            action: string;
            user_id: string | null;
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
