import { Prisma } from '@prisma/client';
export declare const CAMPAIGN_COOLDOWN_DAYS = 7;
export declare const OUTREACH_ATTRIBUTION_DAYS = 30;
export declare const MS_PER_DAY = 86400000;
export declare const INSIGHT_WINDOW_DAYS = 30;
export type InsightListType = 'no_show' | 'recall' | 'churn' | 'conversion';
export declare function buildInsightBaseWhere(clinicId: string, branchId?: string): Prisma.PatientInsightScoreWhereInput;
export declare function campaignCooldownBefore(now?: Date): Date;
export declare function buildNoShowListWhere(clinicId: string, branchId?: string, riskLevels?: string[]): Prisma.PatientInsightScoreWhereInput;
export declare function buildRecallListWhere(clinicId: string, branchId?: string, now?: Date): Prisma.PatientInsightScoreWhereInput;
export declare function buildChurnListWhere(clinicId: string, branchId?: string, now?: Date): Prisma.PatientInsightScoreWhereInput;
export declare function buildRecallCampaignWhere(clinicId: string, branchId?: string, now?: Date): Prisma.PatientInsightScoreWhereInput;
export declare function buildChurnCampaignWhere(clinicId: string, branchId?: string, riskLevel?: string, now?: Date): Prisma.PatientInsightScoreWhereInput;
export declare function buildListWhereByType(type: InsightListType, clinicId: string, branchId?: string, now?: Date): Prisma.PatientInsightScoreWhereInput;
export declare function buildCampaignScoreWhere(segmentType: string, clinicId: string, config: Record<string, unknown>, now?: Date): Prisma.PatientInsightScoreWhereInput | null;
export declare function buildEligibleWhere(type: 'recall' | 'churn', clinicId: string, branchId?: string, now?: Date): Prisma.PatientInsightScoreWhereInput;
export declare function explainRecallExclusion(score: {
    recall_due: boolean;
    recall_status: string | null;
    recall_snoozed_until: Date | null;
    churn_risk: string;
    churn_factors?: unknown;
    branch_id?: string;
    patient?: {
        branch_id: string;
    } | null;
}, opts?: {
    branchId?: string;
}, now?: Date): {
    visible_on_list: boolean;
    visible_on_badge: boolean;
    exclusion_reasons: string[];
};
export declare function isRecallListVisible(score: {
    recall_due: boolean;
    recall_status: string | null;
    recall_snoozed_until: Date | null;
    churn_risk: string;
    churn_factors?: unknown;
}, now?: Date): boolean;
export declare function isChurnListVisible(score: {
    churn_risk: string;
    recall_status: string | null;
    churn_status: string | null;
    churn_snoozed_until: Date | null;
    churn_retry_after: Date | null;
    churn_factors?: unknown;
}, now?: Date): boolean;
