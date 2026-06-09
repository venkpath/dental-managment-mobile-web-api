import type { Prisma } from '@prisma/client';

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

/** Patients visible on the "Due for a Check-up" list. */
export function buildRecallListWhere(
  clinicId: string,
  branchId?: string,
  now = new Date(),
): Prisma.PatientInsightScoreWhereInput {
  return {
    ...buildInsightBaseWhere(clinicId, branchId),
    recall_due: true,
    NOT: [
      { recall_status: 'moved_inactive' },
      { recall_snoozed_until: { gt: now } },
      // 18m+ inactive patients belong in the inactive list, not recall
      { churn_risk: { in: ['medium', 'high'] } },
      // Already rebooked — same rule as patient list badges (insight-badges.tsx)
      { churn_factors: { path: ['has_future_appt'], equals: true } },
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
    ],
    NOT: [
      { churn_status: 'declined' },
      { churn_snoozed_until: { gt: now } },
      // Already rebooked — exclude until next insight recompute clears churn_factors
      { churn_factors: { path: ['has_future_appt'], equals: true } },
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
