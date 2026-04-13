export declare enum SubscriptionStatus {
    TRIAL = "trial",
    ACTIVE = "active",
    EXPIRED = "expired",
    SUSPENDED = "suspended"
}
export declare class UpdateSubscriptionDto {
    plan_id?: string;
    subscription_status?: SubscriptionStatus;
    trial_ends_at?: string;
    ai_usage_count?: number;
    is_complimentary?: boolean;
}
