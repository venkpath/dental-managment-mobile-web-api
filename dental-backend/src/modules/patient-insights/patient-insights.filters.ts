import { Prisma } from '@prisma/client';

export const CAMPAIGN_COOLDOWN_DAYS = 7;
export const OUTREACH_ATTRIBUTION_DAYS = 30;
export const MS_PER_DAY = 86_400_000;
export const INSIGHT_WINDOW_DAYS = 30;

export type InsightListType = 'no_show' | 'recall' | 'churn' | 'conversion';

export function buildInsightBaseWhere(
  clinicId: string,
  branchId?: string,
): Prisma.PatientInsightScoreWhereInput {
  if (!branchId) return { clinic_id: clinicId };
  // Use the patient's current branch (source of truth). Denormalized score.branch_id can lag
  // after a patient transfer or partial branch-scoped recompute, which caused list badges to
  // show recall while summary/list counts stayed at 0.
  return {
    clinic_id: clinicId,
    patient: { branch_id: branchId },
  };
}

export function campaignCooldownBefore(now = new Date()): Date {
  return new Date(now.getTime() - CAMPAIGN_COOLDOWN_DAYS * MS_PER_DAY);
}

export function buildNoShowListWhere(
  clinicId: string,
  branchId?: string,
  riskLevels: string[] = ['high', 'medium'],
): Prisma.PatientInsightScoreWhereInput {
  return {
    ...buildInsightBaseWhere(clinicId, branchId),
    no_show_risk: { in: riskLevels },
  };
}

/** SQL NOT (col = x) drops NULL rows — mirror isRecallListVisible / isChurnListVisible instead. */
function notSnoozed(
  field: 'recall_snoozed_until' | 'churn_snoozed_until',
  now: Date,
): Prisma.PatientInsightScoreWhereInput {
  return {
    OR: [{ [field]: null }, { [field]: { lte: now } }],
  };
}

/**
 * Live DB check: exclude patients who have already returned via a future appointment OR a
 * recent paid/partial invoice (walk-in). Does NOT rely on the stale churn_factors JSON field.
 * "Recent" is defined as within OUTREACH_ATTRIBUTION_DAYS so a walk-in dismisses the list entry
 * immediately without waiting for computeForPatient to run.
 */
function withoutActiveReturn(now: Date): Prisma.PatientInsightScoreWhereInput {
  const recentSince = new Date(now.getTime() - OUTREACH_ATTRIBUTION_DAYS * MS_PER_DAY);
  return {
    AND: [
      {
        NOT: {
          patient: {
            appointments: {
              some: { appointment_date: { gte: now }, status: { not: 'cancelled' } },
            },
          },
        },
      },
      {
        NOT: {
          patient: {
            invoices: {
              some: {
                lifecycle_status: 'issued',
                status: { in: ['paid', 'partially_paid'] },
                created_at: { gte: recentSince },
              },
            },
          },
        },
      },
    ],
  };
}

/** Patients visible on the "Due for a Check-up" list. */
export function buildRecallListWhere(
  clinicId: string,
  branchId?: string,
  now = new Date(),
): Prisma.PatientInsightScoreWhereInput {
  return {
    ...buildInsightBaseWhere(clinicId, branchId),
    recall_due: true,
    AND: [
      {
        OR: [{ recall_status: null }, { recall_status: { not: 'moved_inactive' } }],
      },
      notSnoozed('recall_snoozed_until', now),
      // 18m+ inactive patients belong in the inactive list, not recall
      { churn_risk: { notIn: ['medium', 'high'] } },
      // Hide immediately when patient books an appointment or pays a walk-in invoice
      withoutActiveReturn(now),
    ],
  };
}

/** Patients visible on the "Inactive Patients" list. */
export function buildChurnListWhere(
  clinicId: string,
  branchId?: string,
  now = new Date(),
): Prisma.PatientInsightScoreWhereInput {
  return {
    ...buildInsightBaseWhere(clinicId, branchId),
    AND: [
      {
        OR: [
          { churn_risk: { in: ['medium', 'high'] } },
          { recall_status: 'moved_inactive' },
        ],
      },
      {
        OR: [{ churn_retry_after: null }, { churn_retry_after: { lt: now } }],
      },
      {
        OR: [{ churn_status: null }, { churn_status: { not: 'declined' } }],
      },
      notSnoozed('churn_snoozed_until', now),
      // Hide immediately when patient books an appointment or pays a walk-in invoice
      withoutActiveReturn(now),
    ],
  };
}

/** Recall patients eligible for a campaign send (list rules + 7-day cooldown). */
export function buildRecallCampaignWhere(
  clinicId: string,
  branchId?: string,
  now = new Date(),
): Prisma.PatientInsightScoreWhereInput {
  const cooldown = campaignCooldownBefore(now);
  return {
    AND: [
      buildRecallListWhere(clinicId, branchId, now),
      {
        OR: [
          { recall_last_contacted_at: null },
          { recall_last_contacted_at: { lt: cooldown } },
        ],
      },
    ],
  };
}

/** Inactive patients eligible for a campaign send (list rules + 7-day cooldown). */
export function buildChurnCampaignWhere(
  clinicId: string,
  branchId?: string,
  riskLevel?: string,
  now = new Date(),
): Prisma.PatientInsightScoreWhereInput {
  const cooldown = campaignCooldownBefore(now);
  const base = buildChurnListWhere(clinicId, branchId, now);

  if (riskLevel && riskLevel !== 'all') {
    const levels = riskLevel === 'high' ? ['high'] : ['medium'];
    return {
      AND: [
        base,
        {
          OR: [
            { recall_status: 'moved_inactive' },
            { churn_risk: { in: levels } },
          ],
        },
        {
          OR: [
            { churn_last_contacted_at: null },
            { churn_last_contacted_at: { lt: cooldown } },
          ],
        },
      ],
    };
  }

  return {
    AND: [
      base,
      {
        OR: [
          { churn_last_contacted_at: null },
          { churn_last_contacted_at: { lt: cooldown } },
        ],
      },
    ],
  };
}

export function buildListWhereByType(
  type: InsightListType,
  clinicId: string,
  branchId?: string,
  now = new Date(),
): Prisma.PatientInsightScoreWhereInput {
  switch (type) {
    case 'no_show':
      return buildNoShowListWhere(clinicId, branchId);
    case 'recall':
      return buildRecallListWhere(clinicId, branchId, now);
    case 'churn':
      return buildChurnListWhere(clinicId, branchId, now);
    case 'conversion':
      return { ...buildInsightBaseWhere(clinicId, branchId), conversion_score: { gte: 40 } };
  }
}

export function buildCampaignScoreWhere(
  segmentType: string,
  clinicId: string,
  config: Record<string, unknown>,
  now = new Date(),
): Prisma.PatientInsightScoreWhereInput | null {
  const branchId = typeof config.branch_id === 'string' ? config.branch_id : undefined;

  switch (segmentType) {
    case 'recall_due':
      return buildRecallCampaignWhere(clinicId, branchId, now);
    case 'churn_risk':
      return buildChurnCampaignWhere(
        clinicId,
        branchId,
        typeof config.risk_level === 'string' ? config.risk_level : undefined,
        now,
      );
    case 'no_show_risk': {
      const level = typeof config.risk_level === 'string' ? config.risk_level : 'all';
      const levels =
        level === 'high' ? ['high'] : level === 'medium' ? ['medium'] : ['high', 'medium'];
      return buildNoShowListWhere(clinicId, branchId, levels);
    }
    default:
      return null;
  }
}

export function buildEligibleWhere(
  type: 'recall' | 'churn',
  clinicId: string,
  branchId?: string,
  now = new Date(),
): Prisma.PatientInsightScoreWhereInput {
  return type === 'recall'
    ? buildRecallCampaignWhere(clinicId, branchId, now)
    : buildChurnCampaignWhere(clinicId, branchId, undefined, now);
}

/** Human-readable reasons a score is excluded from the recall list / summary count. */
export function explainRecallExclusion(
  score: {
    recall_due: boolean;
    recall_status: string | null;
    recall_snoozed_until: Date | null;
    churn_risk: string;
    churn_factors?: unknown;
    branch_id?: string;
    patient?: { branch_id: string } | null;
  },
  opts?: { branchId?: string },
  now = new Date(),
): { visible_on_list: boolean; visible_on_badge: boolean; exclusion_reasons: string[] } {
  const reasons: string[] = [];

  if (!score.recall_due) reasons.push('recall_due is false — run Recompute after adding a completed treatment');
  if (score.recall_status === 'moved_inactive') {
    reasons.push('recall_status is moved_inactive (30-day recall window expired — patient moved to inactive list)');
  }
  if (score.recall_snoozed_until && score.recall_snoozed_until > now) {
    reasons.push(`recall is snoozed until ${score.recall_snoozed_until.toISOString()}`);
  }
  if (score.churn_risk === 'medium' || score.churn_risk === 'high') {
    reasons.push(`churn_risk is ${score.churn_risk} — inactive patients are excluded from recall list`);
  }
  const factors = score.churn_factors as { has_future_appt?: boolean } | null;
  if (factors?.has_future_appt) {
    reasons.push('has_future_appt is true — patient already has an upcoming appointment');
  }
  if (opts?.branchId) {
    const patientBranch = score.patient?.branch_id ?? score.branch_id;
    if (patientBranch !== opts.branchId) {
      reasons.push(
        `branch filter mismatch — patient branch ${patientBranch ?? 'unknown'} ≠ requested ${opts.branchId}`,
      );
    }
  }

  const visibleOnList = score.recall_due && reasons.length === 0;
  // Badge uses the same rules as isRecallListVisible (no separate branch filter on single-patient API)
  const badgeReasons = reasons.filter((r) => !r.startsWith('branch filter'));
  const visibleOnBadge = score.recall_due && badgeReasons.length === 0;

  return {
    visible_on_list: visibleOnList,
    visible_on_badge: visibleOnBadge,
    exclusion_reasons: reasons,
  };
}

/** Whether a score row would appear on the recall list right now. */
export function isRecallListVisible(
  score: {
    recall_due: boolean;
    recall_status: string | null;
    recall_snoozed_until: Date | null;
    churn_risk: string;
    churn_factors?: unknown;
  },
  now = new Date(),
): boolean {
  if (!score.recall_due) return false;
  if (score.recall_status === 'moved_inactive') return false;
  if (score.recall_snoozed_until && score.recall_snoozed_until > now) return false;
  if (score.churn_risk === 'medium' || score.churn_risk === 'high') return false;
  const factors = score.churn_factors as { has_future_appt?: boolean } | null;
  if (factors?.has_future_appt) return false;
  return true;
}

/** Whether a score row would appear on the inactive list right now. */
export function isChurnListVisible(
  score: {
    churn_risk: string;
    recall_status: string | null;
    churn_status: string | null;
    churn_snoozed_until: Date | null;
    churn_retry_after: Date | null;
    churn_factors?: unknown;
  },
  now = new Date(),
): boolean {
  const factors = score.churn_factors as { has_future_appt?: boolean } | null;
  if (factors?.has_future_appt) return false;

  if (score.churn_status === 'declined') return false;
  if (score.churn_snoozed_until && score.churn_snoozed_until > now) return false;
  if (score.churn_retry_after && score.churn_retry_after > now) return false;

  return (
    score.churn_risk === 'medium' ||
    score.churn_risk === 'high' ||
    score.recall_status === 'moved_inactive'
  );
}
