export declare enum SubscriptionStatus {
    TRIAL = "trial",
    ACTIVE = "active",
    EXPIRED = "expired",
    SUSPENDED = "suspended"
}
export declare class UpdateSubscriptionDto {
    plan_id?: string;
    subscription_status?: SubscriptionStatus;
    billing_cycle?: 'monthly' | 'yearly';
    next_billing_at?: string | null;
    trial_ends_at?: string;
    ai_usage_count?: number;
    is_complimentary?: boolean;
}
