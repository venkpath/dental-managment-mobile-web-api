import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminAuthService } from './super-admin-auth.service.js';
import { CreateSuperAdminDto, LoginSuperAdminDto, OnboardClinicDto } from './dto/index.js';
import { ClinicService } from '../clinic/clinic.service.js';
import { UpdateSubscriptionDto } from '../clinic/dto/index.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { BranchService } from '../branch/branch.service.js';
import { UpdateClinicSettingsDto } from '../communication/dto/update-clinic-settings.dto.js';
import { UpsertAutomationRuleDto } from '../automation/dto/upsert-automation-rule.dto.js';
import { CreateBranchDto } from '../branch/dto/create-branch.dto.js';
import { UpdateBranchDto } from '../branch/dto/update-branch.dto.js';
import { UpdateBranchSchedulingDto } from '../branch/dto/update-branch-scheduling.dto.js';
export declare class SuperAdminController {
    private readonly superAdminService;
    private readonly superAdminAuthService;
    private readonly clinicService;
    private readonly communicationService;
    private readonly automationService;
    private readonly branchService;
    constructor(superAdminService: SuperAdminService, superAdminAuthService: SuperAdminAuthService, clinicService: ClinicService, communicationService: CommunicationService, automationService: AutomationService, branchService: BranchService);
    login(dto: LoginSuperAdminDto): Promise<import("./super-admin-auth.service.js").SuperAdminLoginResponse>;
    create(dto: CreateSuperAdminDto): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
    }, "password_hash">>;
    getProfile(admin: {
        id: string;
    }): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
    }, "password_hash">>;
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
            trial_ends_at: Date | null;
            logo_url: string | null;
            ai_usage_count: number;
            ai_quota_override: number | null;
        })[];
    }>;
    listClinics(status?: string, search?: string, page?: string, limit?: string): Promise<{
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
            trial_ends_at: Date | null;
            logo_url: string | null;
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
        trial_ends_at: Date | null;
        logo_url: string | null;
        ai_usage_count: number;
        ai_quota_override: number | null;
    }>;
    updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<{
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
        trial_ends_at: Date | null;
        logo_url: string | null;
        ai_usage_count: number;
        ai_quota_override: number | null;
    }>;
    onboardClinic(dto: OnboardClinicDto): Promise<{
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
            trial_ends_at: Date | null;
            logo_url: string | null;
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
    changePassword(admin: {
        id: string;
    }, dto: {
        current_password: string;
        new_password: string;
    }): Promise<{
        message: string;
    }>;
    getAuditLogs(page?: string, limit?: string, clinicId?: string, action?: string): Promise<{
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
    impersonateClinic(id: string): Promise<{
        access_token: string;
        clinic: {
            id: string;
            name: string;
        };
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
    getClinicCommunicationSettings(id: string): Promise<{
        can_customize_providers: boolean;
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        google_review_url: string | null;
        enable_email: boolean;
        enable_sms: boolean;
        enable_whatsapp: boolean;
        email_provider: string | null;
        email_config: import("@prisma/client/runtime/client").JsonValue | null;
        sms_provider: string | null;
        sms_config: import("@prisma/client/runtime/client").JsonValue | null;
        whatsapp_provider: string | null;
        whatsapp_config: import("@prisma/client/runtime/client").JsonValue | null;
        fallback_chain: import("@prisma/client/runtime/client").JsonValue | null;
        default_reminder_channels: import("@prisma/client/runtime/client").JsonValue | null;
        daily_message_limit: number;
        send_rate_per_minute: number;
        dnd_start: string | null;
        dnd_end: string | null;
    }>;
    updateClinicCommunicationSettings(id: string, dto: UpdateClinicSettingsDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        google_review_url: string | null;
        enable_email: boolean;
        enable_sms: boolean;
        enable_whatsapp: boolean;
        email_provider: string | null;
        email_config: import("@prisma/client/runtime/client").JsonValue | null;
        sms_provider: string | null;
        sms_config: import("@prisma/client/runtime/client").JsonValue | null;
        whatsapp_provider: string | null;
        whatsapp_config: import("@prisma/client/runtime/client").JsonValue | null;
        fallback_chain: import("@prisma/client/runtime/client").JsonValue | null;
        default_reminder_channels: import("@prisma/client/runtime/client").JsonValue | null;
        daily_message_limit: number;
        send_rate_per_minute: number;
        dnd_start: string | null;
        dnd_end: string | null;
    }>;
    getClinicAutomationRules(id: string): Promise<({
        template: {
            id: string;
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string;
        channel: string;
        config: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        rule_type: string;
    })[]>;
    updateClinicAutomationRule(id: string, ruleType: string, dto: UpsertAutomationRuleDto): Promise<{
        template: {
            id: string;
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string;
        channel: string;
        config: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        rule_type: string;
    }>;
    getClinicBranches(id: string): Promise<{
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
        clinic_id: string;
    }[]>;
    createClinicBranch(id: string, dto: CreateBranchDto): Promise<{
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
        clinic_id: string;
    }>;
    updateClinicBranch(id: string, branchId: string, dto: UpdateBranchDto): Promise<{
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
        clinic_id: string;
    }>;
    getClinicBranchScheduling(id: string, branchId: string): Promise<{
        working_start_time: string;
        working_end_time: string;
        lunch_start_time: string | null;
        lunch_end_time: string | null;
        slot_duration: number;
        default_appt_duration: number;
        buffer_minutes: number;
        advance_booking_days: number;
        working_days: string;
    }>;
    updateClinicBranchScheduling(id: string, branchId: string, dto: UpdateBranchSchedulingDto): Promise<{
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
        clinic_id: string;
    }>;
    getGlobalSettings(): Promise<{
        [k: string]: string;
    }>;
    updateGlobalSetting(key: string, body: {
        value: string;
    }): Promise<{
        updated_at: Date;
        key: string;
        value: string;
    }>;
    updateClinicAiQuota(id: string, body: {
        quota: number | null;
    }): Promise<{
        id: string;
        name: string;
        ai_usage_count: number;
        ai_quota_override: number | null;
    }>;
    resetClinicAiUsage(id: string): Promise<{
        id: string;
        name: string;
        ai_usage_count: number;
    }>;
}
