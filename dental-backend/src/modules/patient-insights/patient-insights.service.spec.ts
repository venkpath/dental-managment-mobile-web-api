import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PatientInsightsService } from './patient-insights.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { MS_PER_DAY, OUTREACH_ATTRIBUTION_DAYS } from './patient-insights.filters.js';

const clinicId = '11111111-1111-1111-1111-111111111111';
const patientId = '22222222-2222-2222-2222-222222222222';
const appointmentId = '33333333-3333-3333-3333-333333333333';
const userId = '44444444-4444-4444-4444-444444444444';

describe('PatientInsightsService', () => {
  let service: PatientInsightsService;

  const mockPrisma = {
    patientInsightScore: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      aggregate: jest.fn(),
    },
    insightComputationBatch: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    patient: { findMany: jest.fn(), findFirst: jest.fn() },
    invoice: { aggregate: jest.fn() },
  };

  const mockAuditLog = { log: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientInsightsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();

    service = module.get(PatientInsightsService);
  });

  describe('recordAction', () => {
    const baseScore = {
      clinic_id: clinicId,
      patient_id: patientId,
      recall_window_start: new Date('2026-06-01'),
      churn_window_start: null,
    };

    it('rejects decline on recall type', async () => {
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue(baseScore);
      await expect(
        service.recordAction(clinicId, patientId, { type: 'recall', action: 'decline' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not set last_contacted_at on snooze', async () => {
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue(baseScore);
      mockPrisma.patientInsightScore.update.mockResolvedValue({});

      await service.recordAction(clinicId, patientId, {
        type: 'recall',
        action: 'snooze',
        snooze_days: 7,
      }, userId);

      expect(mockPrisma.patientInsightScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ recall_last_contacted_at: expect.anything() }),
        }),
      );
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'insight_action',
          entity: 'patient_insight',
          user_id: userId,
        }),
      );
    });

    it('throws when score missing', async () => {
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue(null);
      await expect(
        service.recordAction(clinicId, patientId, { type: 'recall', action: 'contacted' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('attributeBookingAfterOutreach', () => {
    it('attributes recall booking within outreach window', async () => {
      const contactedAt = new Date(Date.now() - 5 * MS_PER_DAY);
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue({
        recall_last_contacted_at: contactedAt,
        recall_booked_after_outreach_at: null,
        churn_last_contacted_at: null,
        churn_booked_after_outreach_at: null,
      });
      mockPrisma.patientInsightScore.update.mockResolvedValue({});

      await service.attributeBookingAfterOutreach(clinicId, patientId, appointmentId);

      expect(mockPrisma.patientInsightScore.update).toHaveBeenCalledWith({
        where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        data: expect.objectContaining({
          recall_booked_appointment_id: appointmentId,
          recall_booked_after_outreach_at: expect.any(Date),
        }),
      });
    });

    it('skips when contact was outside attribution window', async () => {
      const contactedAt = new Date(Date.now() - (OUTREACH_ATTRIBUTION_DAYS + 5) * MS_PER_DAY);
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue({
        recall_last_contacted_at: contactedAt,
        recall_booked_after_outreach_at: null,
        churn_last_contacted_at: null,
        churn_booked_after_outreach_at: null,
      });

      await service.attributeBookingAfterOutreach(clinicId, patientId, appointmentId);

      expect(mockPrisma.patientInsightScore.update).not.toHaveBeenCalled();
    });
  });

  describe('getClinicAvgVisitValue', () => {
    it('returns ₹1,500 when clinic has no paid invoice history', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _avg: { net_amount: null } });
      await expect(service.getClinicAvgVisitValue(clinicId)).resolves.toBe(1500);
    });

    it('returns rounded clinic average from paid invoices', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _avg: { net_amount: 2345.67 } });
      await expect(service.getClinicAvgVisitValue(clinicId)).resolves.toBe(2346);
    });
  });

  describe('getOpportunitySummary', () => {
    beforeEach(() => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _avg: { net_amount: 2000 } });
      mockPrisma.patientInsightScore.findMany
        .mockResolvedValueOnce([{ patient_id: 'r1', patient: { invoices: [{ net_amount: 2000 }] } }])
        .mockResolvedValueOnce([
          { patient_id: 'n1', no_show_risk: 'high', patient: { invoices: [{ net_amount: 1000 }] } },
        ])
        .mockResolvedValueOnce([]);
    });

    it('returns deduped bucket values using clinic invoice average', async () => {
      const result = await service.getOpportunitySummary(clinicId);
      expect(result.clinic_avg_visit_value).toBe(2000);
      expect(result.recall.count).toBe(1);
      expect(result.no_show.count).toBe(1);
      expect(result.total_patients).toBe(2);
      expect(result.no_show.value).toBe(800);
      expect(result.total_opportunity).toBe(2800);
    });
  });

  describe('attributeNoShowAttendance', () => {
    it('stamps attendance for high/medium no-show risk patients', async () => {
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue({
        no_show_risk: 'high',
        no_show_attended_at: null,
      });
      mockPrisma.patientInsightScore.update.mockResolvedValue({});

      await service.attributeNoShowAttendance(clinicId, patientId, appointmentId);

      expect(mockPrisma.patientInsightScore.update).toHaveBeenCalledWith({
        where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        data: expect.objectContaining({
          no_show_attended_at: expect.any(Date),
          no_show_attended_appointment_id: appointmentId,
        }),
      });
    });

    it('skips when already attributed or low risk', async () => {
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue({
        no_show_risk: 'low',
        no_show_attended_at: null,
      });
      await service.attributeNoShowAttendance(clinicId, patientId, appointmentId);
      expect(mockPrisma.patientInsightScore.update).not.toHaveBeenCalled();
    });
  });

  describe('attributeWalkInAfterOutreach', () => {
    const contactedAt = new Date(Date.now() - 5 * MS_PER_DAY);

    it('stamps recall return when contacted within attribution window', async () => {
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue({
        recall_last_contacted_at: contactedAt,
        recall_booked_after_outreach_at: null,
        churn_last_contacted_at: null,
        churn_booked_after_outreach_at: null,
        no_show_risk: 'low',
        no_show_attended_at: null,
      });
      mockPrisma.patientInsightScore.update.mockResolvedValue({});

      await service.attributeWalkInAfterOutreach(clinicId, patientId);

      expect(mockPrisma.patientInsightScore.update).toHaveBeenCalledWith({
        where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        data: expect.objectContaining({
          recall_booked_after_outreach_at: expect.any(Date),
        }),
      });
      expect(mockPrisma.patientInsightScore.update.mock.calls[0][0].data).not.toHaveProperty(
        'recall_booked_appointment_id',
      );
    });

    it('stamps inactive return when churn outreach is recent', async () => {
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue({
        recall_last_contacted_at: null,
        recall_booked_after_outreach_at: null,
        churn_last_contacted_at: contactedAt,
        churn_booked_after_outreach_at: null,
        no_show_risk: 'low',
        no_show_attended_at: null,
      });
      mockPrisma.patientInsightScore.update.mockResolvedValue({});

      await service.attributeWalkInAfterOutreach(clinicId, patientId);

      expect(mockPrisma.patientInsightScore.update).toHaveBeenCalledWith({
        where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        data: expect.objectContaining({
          churn_booked_after_outreach_at: expect.any(Date),
        }),
      });
    });

    it('stamps no-show attendance for high-risk walk-in without prior outreach', async () => {
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue({
        recall_last_contacted_at: null,
        recall_booked_after_outreach_at: null,
        churn_last_contacted_at: null,
        churn_booked_after_outreach_at: null,
        no_show_risk: 'high',
        no_show_attended_at: null,
      });
      mockPrisma.patientInsightScore.update.mockResolvedValue({});

      await service.attributeWalkInAfterOutreach(clinicId, patientId);

      expect(mockPrisma.patientInsightScore.update).toHaveBeenCalledWith({
        where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        data: expect.objectContaining({
          no_show_attended_at: expect.any(Date),
        }),
      });
    });

    it('skips when recall contact was outside attribution window', async () => {
      const oldContact = new Date(Date.now() - (OUTREACH_ATTRIBUTION_DAYS + 5) * MS_PER_DAY);
      mockPrisma.patientInsightScore.findUnique.mockResolvedValue({
        recall_last_contacted_at: oldContact,
        recall_booked_after_outreach_at: null,
        churn_last_contacted_at: null,
        churn_booked_after_outreach_at: null,
        no_show_risk: 'low',
        no_show_attended_at: null,
      });

      await service.attributeWalkInAfterOutreach(clinicId, patientId);

      expect(mockPrisma.patientInsightScore.update).not.toHaveBeenCalled();
    });
  });

  describe('getRecoveredSummary', () => {
    const stampDate = new Date('2026-05-01T10:00:00Z');

    beforeEach(() => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _avg: { net_amount: 2000 } });
    });

    it('sums invoice value created on or after recovery stamp', async () => {
      mockPrisma.patientInsightScore.findMany
        .mockResolvedValueOnce([
          {
            patient_id: patientId,
            recall_booked_after_outreach_at: stampDate,
            patient: {
              invoices: [
                { net_amount: 2000, created_at: new Date('2026-04-01') },
                { net_amount: 3000, created_at: new Date('2026-05-10') },
              ],
            },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getRecoveredSummary(clinicId);

      expect(result.period_days).toBe(90);
      expect(result.recall.count).toBe(1);
      expect(result.recall.recovered).toBe(3000);
      expect(result.recall.expected).toBe(2000);
      expect(result.total_recovered).toBe(3000);
      expect(result.total_patients_returned).toBe(1);
      expect(result.exceeded).toBe(true);
    });

    it('dedupes no-show when patient already in recall bucket', async () => {
      mockPrisma.patientInsightScore.findMany
        .mockResolvedValueOnce([
          {
            patient_id: patientId,
            recall_booked_after_outreach_at: stampDate,
            patient: { invoices: [{ net_amount: 1000, created_at: new Date('2026-05-02') }] },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            patient_id: patientId,
            no_show_attended_at: stampDate,
            patient: { invoices: [{ net_amount: 5000, created_at: new Date('2026-05-03') }] },
          },
        ]);

      const result = await service.getRecoveredSummary(clinicId);

      expect(result.recall.recovered).toBe(1000);
      expect(result.no_show.count).toBe(0);
      expect(result.total_patients_returned).toBe(1);
    });
  });

  describe('stampCampaignContacts', () => {
    it('no-ops on empty patient list', async () => {
      await service.stampCampaignContacts(clinicId, [], 'recall');
      expect(mockPrisma.patientInsightScore.updateMany).not.toHaveBeenCalled();
    });

    it('stamps only provided patient ids', async () => {
      await service.stampCampaignContacts(clinicId, [patientId], 'churn');
      expect(mockPrisma.patientInsightScore.updateMany).toHaveBeenCalledWith({
        where: { clinic_id: clinicId, patient_id: { in: [patientId] } },
        data: expect.objectContaining({
          churn_status: 'contacted',
          churn_last_contacted_at: expect.any(Date),
        }),
      });
    });
  });
});
