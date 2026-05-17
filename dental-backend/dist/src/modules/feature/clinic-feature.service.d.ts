import { PrismaService } from '../../database/prisma.service.js';
export interface EffectiveFeatureRow {
    feature_id: string;
    key: string;
    description: string;
    is_enabled: boolean;
    source: 'plan' | 'override' | 'none';
    plan_enabled: boolean | null;
    override_enabled: boolean | null;
    redundant_with_plan: boolean;
    reason: string | null;
    granted_by_super_admin_id: string | null;
    expires_at: Date | null;
}
export interface EffectiveLimits {
    max_branches: number | null;
    max_staff: number | null;
    ai_quota: number | null;
    max_patients_per_month: number | null;
    max_appointments_per_month: number | null;
    max_invoices_per_month: number | null;
    max_treatments_per_month: number | null;
    max_prescriptions_per_month: number | null;
    max_consultations_per_month: number | null;
}
export interface FeatureOverrideUpsert {
    feature_id: string;
    is_enabled: boolean | null;
    reason?: string | null;
    expires_at?: Date | null;
}
export declare class ClinicFeatureService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getEffectiveFeatures(clinicId: string): Promise<EffectiveFeatureRow[]>;
    getEffectiveFeatureKeys(clinicId: string): Promise<string[]>;
    getEffectiveLimits(clinicId: string): Promise<EffectiveLimits>;
    isFeatureEnabled(clinicId: string, featureKey: string): Promise<boolean>;
    upsertOverrides(clinicId: string, overrides: FeatureOverrideUpsert[], grantedBySuperAdminId?: string | null): Promise<void>;
    getEffectivePrice(clinicId: string, billingCycle: 'monthly' | 'yearly'): Promise<{
        amount: number | null;
        source: 'custom' | 'plan' | 'none';
        custom_price_monthly: number | null;
        custom_price_yearly: number | null;
        custom_expires_at: Date | null;
        custom_reason: string | null;
        plan_amount: number | null;
    }>;
    setCustomPrice(clinicId: string, input: {
        custom_price_monthly: number | null;
        custom_price_yearly: number | null;
        expires_at: Date | null;
        reason: string | null;
    }, grantedBySuperAdminId: string): Promise<void>;
    removeOverride(clinicId: string, featureId: string): Promise<void>;
    purgeExpiredOverrides(now?: Date): Promise<number>;
    cleanupExpiredOverrides(): Promise<void>;
}
