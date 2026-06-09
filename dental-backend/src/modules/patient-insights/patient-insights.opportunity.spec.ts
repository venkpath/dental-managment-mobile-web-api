import {
  buildRevenueInvoiceWhere,
  computeOpportunityValues,
  dedupeAtRiskBuckets,
  DEFAULT_VISIT_VALUE_FALLBACK,
  MAX_VISIT_VALUE_PER_PATIENT,
  patientAvgFromInvoices,
  resolveClinicAvgVisitValue,
} from './patient-insights.opportunity.js';

describe('patient-insights.opportunity', () => {
  describe('resolveClinicAvgVisitValue', () => {
    it('uses ₹1,500 fallback when clinic has no meaningful invoice history', () => {
      expect(resolveClinicAvgVisitValue(0)).toBe(DEFAULT_VISIT_VALUE_FALLBACK);
      expect(resolveClinicAvgVisitValue(50)).toBe(DEFAULT_VISIT_VALUE_FALLBACK);
    });

    it('uses clinic average when above threshold and caps at ₹5L', () => {
      expect(resolveClinicAvgVisitValue(2500)).toBe(2500);
      expect(resolveClinicAvgVisitValue(600_000)).toBe(MAX_VISIT_VALUE_PER_PATIENT);
    });
  });

  describe('patientAvgFromInvoices', () => {
    it('falls back to clinic default when patient has no invoices', () => {
      expect(patientAvgFromInvoices([], 1500)).toBe(1500);
    });

    it('averages last invoices and caps per patient', () => {
      const avg = patientAvgFromInvoices(
        [{ net_amount: 2000 }, { net_amount: 4000 }],
        1500,
      );
      expect(avg).toBe(3000);
    });
  });

  describe('dedupeAtRiskBuckets', () => {
    it('counts each patient in only one bucket (no-show > recall > inactive)', () => {
      const noShow = [{ patient_id: 'a' }, { patient_id: 'b' }];
      const recall = [{ patient_id: 'a' }, { patient_id: 'c' }];
      const churn = [{ patient_id: 'b' }, { patient_id: 'c' }, { patient_id: 'd' }];

      const buckets = dedupeAtRiskBuckets(noShow, recall, churn);
      expect(buckets.noShowRows).toHaveLength(2);
      expect(buckets.recallUnique.map((r) => r.patient_id)).toEqual(['c']);
      expect(buckets.churnUnique.map((r) => r.patient_id)).toEqual(['d']);
      expect(buckets.totalUniquePatients).toBe(4);
    });
  });

  describe('buildRevenueInvoiceWhere', () => {
    it('excludes drafts and cancelled invoices', () => {
      const where = buildRevenueInvoiceWhere('clinic-1', 'branch-1');
      expect(where.lifecycle_status).toBe('issued');
      expect(where.status).toEqual({ in: ['paid', 'partially_paid', 'pending'] });
      expect(where.branch_id).toBe('branch-1');
    });
  });

  describe('computeOpportunityValues', () => {
    it('weights no-show by risk level', () => {
      const buckets = dedupeAtRiskBuckets(
        [
          { patient_id: 'a', no_show_risk: 'high', patient: { invoices: [{ net_amount: 1000 }] } },
          { patient_id: 'b', no_show_risk: 'medium', patient: { invoices: [{ net_amount: 1000 }] } },
        ],
        [],
        [],
      );
      const result = computeOpportunityValues(buckets, 1500);
      expect(result.no_show.count).toBe(2);
      expect(result.no_show.value).toBe(800 + 500);
      expect(result.total_patients).toBe(2);
    });
  });
});
