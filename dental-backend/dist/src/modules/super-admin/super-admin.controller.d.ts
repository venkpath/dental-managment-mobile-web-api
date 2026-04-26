import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminAuthService } from './super-admin-auth.service.js';
import { SuperAdminWhatsAppService } from './super-admin-whatsapp.service.js';
import { CreateSuperAdminDto, LoginSuperAdminDto, OnboardClinicDto } from './dto/index.js';
import { ClinicService } from '../clinic/clinic.service.js';
import { UpdateSubscriptionDto } from '../clinic/dto/index.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { BranchService } from '../branch/branch.service.js';
import { AiUsageService } from '../ai/ai-usage.service.js';
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
    private readonly whatsAppService;
    private readonly aiUsageService;
    constructor(superAdminService: SuperAdminService, superAdminAuthService: SuperAdminAuthService, clinicService: ClinicService, communicationService: CommunicationService, automationService: AutomationService, branchService: BranchService, whatsAppService: SuperAdminWhatsAppService, aiUsageService: AiUsageService);
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
            billing_cycle: string;
            trial_ends_at: Date | null;
            is_complimentary: boolean;
            has_own_waba: boolean;
            logo_url: string | null;
            currency_code: string;
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
            billing_cycle: string;
            trial_ends_at: Date | null;
            is_complimentary: boolean;
            has_own_waba: boolean;
            logo_url: string | null;
            currency_code: string;
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
            price_yearly: import("@prisma/client-runtime-utils").Decimal | null;
            max_branches: number;
            max_staff: number;
            ai_quota: number;
            ai_overage_cap: number;
            max_patients_per_month: number | null;
            max_appointments_per_month: number | null;
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
        is_complimentary: boolean;
        has_own_waba: boolean;
        logo_url: string | null;
        currency_code: string;
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
        billing_cycle: string;
        trial_ends_at: Date | null;
        is_complimentary: boolean;
        has_own_waba: boolean;
        logo_url: string | null;
        currency_code: string;
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
            billing_cycle: string;
            trial_ends_at: Date | null;
            is_complimentary: boolean;
            has_own_waba: boolean;
            logo_url: string | null;
            currency_code: string;
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
    getClinicUsage(id: string): Promise<{
        clinic_id: string;
        plan: string | null;
        billing_cycle: string;
        has_own_waba: boolean;
        period_start: string;
        period_end: string;
        whatsapp: {
            sent: number;
            included: number;
            hard_limit: number | null;
            remaining: number | null;
            allow_overage: boolean;
            approaching_limit: boolean;
            blocked: boolean;
        };
        sms: {
            sent: number;
        };
        email: {
            sent: number;
        };
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
    getWhatsAppStatus(): {
        connected: boolean;
        phoneNumberId: string | null;
        wabaId: string | null;
    };
    listConversations(page?: string, limit?: string): Promise<{
        data: {
            phone: string;
            contact_name: string;
            last_message: string;
            last_at: Date;
            last_direction: string;
            last_status: string;
            last_inbound_at: Date | null;
            unread_count: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
        };
    }>;
    getConversationMessages(phone: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            status: string;
            created_at: Date;
            channel: string;
            template_name: string | null;
            body: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            direction: string;
            wa_message_id: string | null;
            sent_at: Date | null;
            from_phone: string;
            to_phone: string;
            contact_phone: string;
            contact_name: string | null;
            message_type: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            total_pages: number;
            normalized_phone: string;
        };
    }>;
    sendReply(phone: string, body: {
        message: string;
    }): Promise<{
        success: boolean;
        message_id: string;
        error: string | undefined;
    }>;
    sendTemplate(body: {
        phone: string;
        template_name: string;
        language_code?: string;
        body_params?: string[];
        contact_name?: string;
    }): Promise<{
        success: boolean;
        message_id: string;
        error: string | undefined;
    }>;
    listAiApprovalRequests(status?: string): Promise<({
        clinic: {
            id: string;
            email: string;
            name: string;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        cycle_start: Date;
        requested_by: string | null;
        requested_amount: number;
        reason: string;
        approved_amount: number | null;
        approved_by: string | null;
        decision_note: string | null;
        decided_at: Date | null;
    })[]>;
    decideAiApprovalRequest(admin: {
        id: string;
    }, id: string, body: {
        status: 'approved' | 'rejected';
        approved_amount?: number;
        note?: string;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        cycle_start: Date;
        requested_by: string | null;
        requested_amount: number;
        reason: string;
        approved_amount: number | null;
        approved_by: string | null;
        decision_note: string | null;
        decided_at: Date | null;
    } | null>;
    listOverageCharges(status?: string): Promise<({
        clinic: {
            id: string;
            email: string;
            name: string;
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        cycle_start: Date;
        cycle_end: Date;
        base_quota: number;
        overage_requests_count: number;
        approved_requests_count: number;
        total_cost_inr: import("@prisma/client-runtime-utils").Decimal;
        paid_at: Date | null;
        paid_by_super_admin_id: string | null;
        payment_reference: string | null;
    })[]>;
    markOverageChargePaid(admin: {
        id: string;
    }, id: string, body: {
        payment_reference?: string;
        note?: string;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        cycle_start: Date;
        cycle_end: Date;
        base_quota: number;
        overage_requests_count: number;
        approved_requests_count: number;
        total_cost_inr: import("@prisma/client-runtime-utils").Decimal;
        paid_at: Date | null;
        paid_by_super_admin_id: string | null;
        payment_reference: string | null;
    }>;
    waiveOverageCharge(admin: {
        id: string;
    }, id: string, body: {
        note?: string;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        cycle_start: Date;
        cycle_end: Date;
        base_quota: number;
        overage_requests_count: number;
        approved_requests_count: number;
        total_cost_inr: import("@prisma/client-runtime-utils").Decimal;
        paid_at: Date | null;
        paid_by_super_admin_id: string | null;
        payment_reference: string | null;
    }>;
}
