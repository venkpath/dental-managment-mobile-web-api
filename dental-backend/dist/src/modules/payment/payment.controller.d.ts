import { PaymentService } from './payment.service.js';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
export declare class PaymentController {
    private readonly paymentService;
    private readonly logger;
    constructor(paymentService: PaymentService);
    getSubscriptionStatus(clinicId: string): Promise<{
        current_period_start: string | null;
        current_period_end: string | null;
        next_charge_at: string | null;
        paid_count: number;
        total_count: number;
        remaining_count: number;
        started_at: string | null;
        ended_at: string | null;
        subscription_status: string;
        plan: {
            id: string;
            name: string;
            price_monthly: import("@prisma/client-runtime-utils").Decimal;
        } | null;
        trial_ends_at: Date | null;
        is_trial_active: boolean | null;
        trial_days_left: number;
        subscription_id: string | null;
        razorpay_key_id: string;
    }>;
    getPlans(): Promise<({
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
    })[]>;
    createSubscription(clinicId: string, body: {
        planKey: string;
    }): Promise<{
        subscriptionId: string;
        shortUrl: string;
    }>;
    cancelSubscription(clinicId: string): Promise<{
        message: string;
    }>;
    handleWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
}
