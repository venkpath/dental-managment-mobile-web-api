import type { Prisma } from '@prisma/client';
export declare const DEFAULT_VISIT_VALUE_FALLBACK = 1500;
export declare const MAX_VISIT_VALUE_PER_PATIENT = 500000;
export declare const MIN_MEANINGFUL_CLINIC_AVG = 100;
export type AtRiskPatientRow = {
    patient_id: string;
    no_show_risk?: string;
    patient?: {
        invoices: {
            net_amount: unknown;
        }[];
    } | null;
};
export type AtRiskBuckets = {
    noShowRows: AtRiskPatientRow[];
    recallUnique: AtRiskPatientRow[];
    churnUnique: AtRiskPatientRow[];
    totalUniquePatients: number;
};
export declare function buildRevenueInvoiceWhere(clinicId: string, branchId?: string): Prisma.InvoiceWhereInput;
export declare function resolveClinicAvgVisitValue(rawAvg: number): number;
export declare function patientAvgFromInvoices(invoices: {
    net_amount: unknown;
}[], clinicDefault: number): number;
export declare function dedupeAtRiskBuckets(noShowRows: AtRiskPatientRow[], recallRows: AtRiskPatientRow[], churnRows: AtRiskPatientRow[]): AtRiskBuckets;
export declare function buildAtRiskScoreSelect(branchId?: string): {
    patient_id: true;
    no_show_risk?: true;
    patient: {
        select: {
            invoices: {
                where: Prisma.InvoiceWhereInput;
                orderBy: {
                    created_at: 'desc';
                };
                take: 5;
                select: {
                    net_amount: true;
                };
            };
        };
    };
};
export type RecoveredBucket = {
    count: number;
    recovered: number;
    expected: number;
};
export type RecoveredSummaryResult = {
    recall: RecoveredBucket;
    inactive: RecoveredBucket;
    no_show: RecoveredBucket;
    total_patients_returned: number;
    total_recovered: number;
    total_expected: number;
    exceeded: boolean;
    period_days: number;
};
export declare function buildAtRiskListQueries(clinicId: string, branchId: string | undefined, now: Date): [
    Prisma.PatientInsightScoreWhereInput,
    Prisma.PatientInsightScoreWhereInput,
    Prisma.PatientInsightScoreWhereInput
];
export declare function computeOpportunityValues(buckets: AtRiskBuckets, clinicDefault: number): {
    recall: {
        count: number;
        value: number;
    };
    no_show: {
        count: number;
        value: number;
    };
    inactive: {
        count: number;
        value: number;
    };
    total_opportunity: number;
    total_patients: number;
    annual_opportunity: number;
};
