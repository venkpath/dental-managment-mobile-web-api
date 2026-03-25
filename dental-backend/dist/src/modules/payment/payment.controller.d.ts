import { PaymentService } from './payment.service.js';
export declare class PaymentController {
    private readonly paymentService;
    private readonly logger;
    constructor(paymentService: PaymentService);
    getSubscriptionStatus(clinicId: string): Promise<{
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
        price_monthly: import("@prisma/client-runtime-utils").Decimal;
        max_branches: number;
        max_staff: number;
        ai_quota: number;
        razorpay_plan_id: string | null;
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
    handleWebhook(body: Record<string, unknown>, signature: string): Promise<{
        received: boolean;
    }>;
}
