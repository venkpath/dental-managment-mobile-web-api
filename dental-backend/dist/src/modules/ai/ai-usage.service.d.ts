import { PrismaService } from '../../database/prisma.service.js';
export interface QuotaSnapshot {
    base_quota: number;
    overage_cap: number;
    overage_enabled: boolean;
    approved_extra: number;
    used_in_cycle: number;
    effective_quota: number;
    cycle_start: Date;
    cycle_end: Date;
    is_blocked_unpaid: boolean;
    pending_charge_id: string | null;
    plan_name: string | null;
}
export declare class AiUsageService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    ensureSettings(clinicId: string): Promise<{
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        overage_enabled: boolean;
        current_cycle_start: Date;
        current_cycle_end: Date;
        used_in_cycle: number;
        approved_extra: number;
        approved_extra_reason: string | null;
    }>;
    private deriveInitialCycle;
    snapshot(clinicId: string): Promise<QuotaSnapshot>;
    reserveSlot(clinicId: string): Promise<QuotaSnapshot>;
    releaseReservation(clinicId: string): Promise<void>;
    recordUsage(params: {
        clinicId: string;
        userId?: string;
        type: string;
        model: string;
        promptTokens: number;
        completionTokens: number;
    }): Promise<void>;
    setOverageEnabled(clinicId: string, enabled: boolean): Promise<{
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        overage_enabled: boolean;
        current_cycle_start: Date;
        current_cycle_end: Date;
        used_in_cycle: number;
        approved_extra: number;
        approved_extra_reason: string | null;
    }>;
    createApprovalRequest(params: {
        clinicId: string;
        userId?: string;
        requestedAmount: number;
        reason: string;
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
    }>;
    listMyApprovalRequests(clinicId: string): Promise<{
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
    }[]>;
    listApprovalRequests(filters?: {
        status?: string;
        clinicId?: string;
    }): Promise<({
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
    decideApprovalRequest(params: {
        requestId: string;
        superAdminId: string;
        status: 'approved' | 'rejected';
        approvedAmount?: number;
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
    listOverageCharges(filters?: {
        status?: string;
        clinicId?: string;
    }): Promise<({
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
        paid_at: Date | null;
        cycle_start: Date;
        cycle_end: Date;
        base_quota: number;
        overage_requests_count: number;
        approved_requests_count: number;
        total_cost_inr: import("@prisma/client-runtime-utils").Decimal;
        paid_by_super_admin_id: string | null;
        payment_reference: string | null;
    })[]>;
    markChargePaid(params: {
        chargeId: string;
        superAdminId: string;
        paymentReference: string;
        note?: string;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        paid_at: Date | null;
        cycle_start: Date;
        cycle_end: Date;
        base_quota: number;
        overage_requests_count: number;
        approved_requests_count: number;
        total_cost_inr: import("@prisma/client-runtime-utils").Decimal;
        paid_by_super_admin_id: string | null;
        payment_reference: string | null;
    }>;
    waiveCharge(params: {
        chargeId: string;
        superAdminId: string;
        note?: string;
    }): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        paid_at: Date | null;
        cycle_start: Date;
        cycle_end: Date;
        base_quota: number;
        overage_requests_count: number;
        approved_requests_count: number;
        total_cost_inr: import("@prisma/client-runtime-utils").Decimal;
        paid_by_super_admin_id: string | null;
        payment_reference: string | null;
    }>;
    settleOldestPendingFromPayment(clinicId: string, paymentReference: string): Promise<void>;
    closeEndedCycles(now?: Date): Promise<number>;
    closeCycleForClinic(clinicId: string): Promise<void>;
    syncCycleWithSubscription(clinicId: string, periodStart: Date, periodEnd: Date): Promise<void>;
}
