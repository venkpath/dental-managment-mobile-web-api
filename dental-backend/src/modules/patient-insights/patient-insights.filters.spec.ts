import {
  buildChurnCampaignWhere,
  buildChurnListWhere,
  buildInsightBaseWhere,
  buildRecallCampaignWhere,
  buildRecallListWhere,
  CAMPAIGN_COOLDOWN_DAYS,
  campaignCooldownBefore,
  isChurnListVisible,
  isRecallListVisible,
  MS_PER_DAY,
} from './patient-insights.filters.js';

const clinicId = '11111111-1111-1111-1111-111111111111';
const branchId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const now = new Date('2026-06-15T12:00:00Z');

describe('patient-insights.filters', () => {
  describe('buildInsightBaseWhere', () => {
    it('filters by patient branch when branchId is provided', () => {
      expect(buildInsightBaseWhere(clinicId, branchId)).toEqual({
        clinic_id: clinicId,
        patient: { branch_id: branchId },
      });
    });

    it('returns clinic-wide scope when branchId is omitted', () => {
      expect(buildInsightBaseWhere(clinicId)).toEqual({ clinic_id: clinicId });
    });
  });

  describe('buildRecallListWhere', () => {
    it('excludes moved_inactive, snoozed, 18m+ churn, and rebooked patients', () => {
      const where = buildRecallListWhere(clinicId, undefined, now);
      expect(where.recall_due).toBe(true);
      expect(where.NOT).toEqual(
        expect.arrayContaining([
          { recall_status: 'moved_inactive' },
          { recall_snoozed_until: { gt: now } },
          { churn_risk: { in: ['medium', 'high'] } },
          { churn_factors: { path: ['has_future_appt'], equals: true } },
        ]),
      );
    });
  });

  describe('buildChurnListWhere', () => {
    it('includes natural inactive or moved from recall', () => {
      const where = buildChurnListWhere(clinicId, undefined, now);
      expect(where.AND).toBeDefined();
      expect(where.NOT).toEqual(
        expect.arrayContaining([
          { churn_status: 'declined' },
          { churn_snoozed_until: { gt: now } },
          { churn_factors: { path: ['has_future_appt'], equals: true } },
        ]),
      );
    });
  });

  describe('campaign cooldown', () => {
    it('buildRecallCampaignWhere requires last contact before cooldown', () => {
      const where = buildRecallCampaignWhere(clinicId, undefined, now);
      const cooldown = campaignCooldownBefore(now);
      const andClauses = where.AND as Record<string, unknown>[];
      const contactClause = andClauses.find((c) => 'OR' in c) as { OR: unknown[] };
      expect(contactClause.OR).toEqual(
        expect.arrayContaining([
          { recall_last_contacted_at: null },
          { recall_last_contacted_at: { lt: cooldown } },
        ]),
      );
    });

    it('cooldown is 7 days before now', () => {
      const cooldown = campaignCooldownBefore(now);
      expect(now.getTime() - cooldown.getTime()).toBe(CAMPAIGN_COOLDOWN_DAYS * MS_PER_DAY);
    });

    it('buildChurnCampaignWhere nests churn list + cooldown', () => {
      const where = buildChurnCampaignWhere(clinicId, undefined, undefined, now);
      expect(where.AND).toHaveLength(2);
    });
  });

  describe('isRecallListVisible', () => {
    it('returns false when churn risk is medium', () => {
      expect(
        isRecallListVisible(
          {
            recall_due: true,
            recall_status: null,
            recall_snoozed_until: null,
            churn_risk: 'medium',
          },
          now,
        ),
      ).toBe(false);
    });

    it('returns false when snoozed', () => {
      const snoozedUntil = new Date(now.getTime() + 3 * MS_PER_DAY);
      expect(
        isRecallListVisible(
          {
            recall_due: true,
            recall_status: 'snoozed',
            recall_snoozed_until: snoozedUntil,
            churn_risk: 'low',
          },
          now,
        ),
      ).toBe(false);
    });

    it('returns true for plain recall patient', () => {
      expect(
        isRecallListVisible(
          {
            recall_due: true,
            recall_status: null,
            recall_snoozed_until: null,
            churn_risk: 'low',
          },
          now,
        ),
      ).toBe(true);
    });

    it('returns false when patient already has a future appointment', () => {
      expect(
        isRecallListVisible(
          {
            recall_due: true,
            recall_status: null,
            recall_snoozed_until: null,
            churn_risk: 'low',
            churn_factors: { has_future_appt: true },
          },
          now,
        ),
      ).toBe(false);
    });
  });

  describe('isChurnListVisible', () => {
    it('returns false when patient has future appointment', () => {
      expect(
        isChurnListVisible(
          {
            churn_risk: 'high',
            recall_status: null,
            churn_status: null,
            churn_snoozed_until: null,
            churn_retry_after: null,
            churn_factors: { has_future_appt: true },
          },
          now,
        ),
      ).toBe(false);
    });

    it('returns true for moved_inactive even with low churn score', () => {
      expect(
        isChurnListVisible(
          {
            churn_risk: 'low',
            recall_status: 'moved_inactive',
            churn_status: null,
            churn_snoozed_until: null,
            churn_retry_after: null,
            churn_factors: { has_future_appt: false },
          },
          now,
        ),
      ).toBe(true);
    });
  });
});
