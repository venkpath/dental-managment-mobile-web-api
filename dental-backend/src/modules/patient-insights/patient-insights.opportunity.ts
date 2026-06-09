import type { Prisma } from '@prisma/client';
import {
  buildChurnListWhere,
  buildNoShowListWhere,
  buildRecallListWhere,
} from './patient-insights.filters.js';

/** Fallback visit value when a clinic has little or no paid invoice history. */
export const DEFAULT_VISIT_VALUE_FALLBACK = 1_500;

/** Cap per patient so implant / full-arch outliers do not dominate totals. */
export const MAX_VISIT_VALUE_PER_PATIENT = 500_000;

/** Clinic-wide avg below this uses the fallback instead of a noisy near-zero average. */
export const MIN_MEANINGFUL_CLINIC_AVG = 100;

export type AtRiskPatientRow = {
  patient_id: string;
  no_show_risk?: string;
  patient?: { invoices: { net_amount: unknown }[] } | null;
};

export type AtRiskBuckets = {
  noShowRows: AtRiskPatientRow[];
  recallUnique: AtRiskPatientRow[];
  churnUnique: AtRiskPatientRow[];
  totalUniquePatients: number;
};

/** Invoices that represent real billed visits (not drafts/cancelled). */
export function buildRevenueInvoiceWhere(
  clinicId: string,
  branchId?: string,
): Prisma.InvoiceWhereInput {
  return {
    clinic_id: clinicId,
    ...(branchId ? { branch_id: branchId } : {}),
    net_amount: { gt: 0 },
    lifecycle_status: 'issued',
    status: { in: ['paid', 'partially_paid', 'pending'] },
  };
}

export function resolveClinicAvgVisitValue(rawAvg: number): number {
  if (rawAvg > MIN_MEANINGFUL_CLINIC_AVG) {
    return Math.min(rawAvg, MAX_VISIT_VALUE_PER_PATIENT);
  }
  return DEFAULT_VISIT_VALUE_FALLBACK;
}

export function patientAvgFromInvoices(
  invoices: { net_amount: unknown }[],
  clinicDefault: number,
): number {
  const valid = invoices.filter((i) => Number(i.net_amount ?? 0) > 0);
  if (valid.length === 0) return clinicDefault;
  const avg = valid.reduce((s, i) => s + Number(i.net_amount), 0) / valid.length;
  return Math.min(Math.max(avg, 0), MAX_VISIT_VALUE_PER_PATIENT);
}

/** Priority: no-show > recall > inactive — same patient only counted once for totals. */
export function dedupeAtRiskBuckets(
  noShowRows: AtRiskPatientRow[],
  recallRows: AtRiskPatientRow[],
  churnRows: AtRiskPatientRow[],
): AtRiskBuckets {
  const noShowIds = new Set(noShowRows.map((r) => r.patient_id));
  const recallIds = new Set(recallRows.map((r) => r.patient_id));
  const recallUnique = recallRows.filter((r) => !noShowIds.has(r.patient_id));
  const churnUnique = churnRows.filter(
    (r) => !noShowIds.has(r.patient_id) && !recallIds.has(r.patient_id),
  );
  return {
    noShowRows,
    recallUnique,
    churnUnique,
    totalUniquePatients: noShowRows.length + recallUnique.length + churnUnique.length,
  };
}

export function buildAtRiskScoreSelect(
  branchId?: string,
): {
  patient_id: true;
  no_show_risk?: true;
  patient: { select: { invoices: { where: Prisma.InvoiceWhereInput; orderBy: { created_at: 'desc' }; take: 5; select: { net_amount: true } } } };
} {
  const invoiceWhere = branchId
    ? { net_amount: { gt: 0 }, branch_id: branchId, lifecycle_status: 'issued' as const, status: { in: ['paid', 'partially_paid', 'pending'] } }
    : { net_amount: { gt: 0 }, lifecycle_status: 'issued' as const, status: { in: ['paid', 'partially_paid', 'pending'] } };

  return {
    patient_id: true,
    patient: {
      select: {
        invoices: {
          where: invoiceWhere,
          orderBy: { created_at: 'desc' },
          take: 5,
          select: { net_amount: true },
        },
      },
    },
  };
}

export type RecoveredBucket = {
  count: number;
  recovered: number; // actual invoice value after the patient returned
  expected: number;  // historical avg × count (what we estimated they'd spend)
};

export type RecoveredSummaryResult = {
  recall:   RecoveredBucket;
  inactive: RecoveredBucket;
  no_show:  RecoveredBucket; // patients who were at risk of missing but actually showed up
  total_patients_returned: number;
  total_recovered: number;
  total_expected: number;
  exceeded: boolean; // true when actual revenue > expected
  period_days: number;
};

export function buildAtRiskListQueries(
  clinicId: string,
  branchId: string | undefined,
  now: Date,
): [
  Prisma.PatientInsightScoreWhereInput,
  Prisma.PatientInsightScoreWhereInput,
  Prisma.PatientInsightScoreWhereInput,
] {
  return [
    buildNoShowListWhere(clinicId, branchId),
    buildRecallListWhere(clinicId, branchId, now),
    buildChurnListWhere(clinicId, branchId, now),
  ];
}

export function computeOpportunityValues(
  buckets: AtRiskBuckets,
  clinicDefault: number,
): {
  recall: { count: number; value: number };
  no_show: { count: number; value: number };
  inactive: { count: number; value: number };
  total_opportunity: number;
  total_patients: number;
  annual_opportunity: number;
} {
  const recallValue = buckets.recallUnique.reduce(
    (s, r) => s + patientAvgFromInvoices(r.patient?.invoices ?? [], clinicDefault),
    0,
  );
  const noShowValue = buckets.noShowRows.reduce((s, r) => {
    const weight = r.no_show_risk === 'high' ? 0.8 : 0.5;
    return s + patientAvgFromInvoices(r.patient?.invoices ?? [], clinicDefault) * weight;
  }, 0);
  const churnValue = buckets.churnUnique.reduce(
    (s, r) => s + patientAvgFromInvoices(r.patient?.invoices ?? [], clinicDefault),
    0,
  );

  const totalOpportunity = Math.round(recallValue + noShowValue + churnValue);

  return {
    recall: { count: buckets.recallUnique.length, value: Math.round(recallValue) },
    no_show: { count: buckets.noShowRows.length, value: Math.round(noShowValue) },
    inactive: { count: buckets.churnUnique.length, value: Math.round(churnValue) },
    total_patients: buckets.totalUniquePatients,
    total_opportunity: totalOpportunity,
    annual_opportunity: totalOpportunity * 12,
  };
}
