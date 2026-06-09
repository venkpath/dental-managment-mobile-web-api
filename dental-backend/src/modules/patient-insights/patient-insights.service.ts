import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { QueryInsightsDto, RecordActionDto } from './dto/query-insights.dto.js';
import {
  clinicDateToUtcMidnight,
  getClinicTodayDateString,
} from '../../common/utils/clinic-timezone.util.js';
import {
  buildChurnListWhere,
  buildEligibleWhere,
  buildInsightBaseWhere,
  buildListWhereByType,
  buildNoShowListWhere,
  buildRecallListWhere,
  CAMPAIGN_COOLDOWN_DAYS,
  campaignCooldownBefore,
  INSIGHT_WINDOW_DAYS,
  MS_PER_DAY,
  OUTREACH_ATTRIBUTION_DAYS,
} from './patient-insights.filters.js';
import {
  buildAtRiskScoreSelect,
  buildRevenueInvoiceWhere,
  computeOpportunityValues,
  dedupeAtRiskBuckets,
  MAX_VISIT_VALUE_PER_PATIENT,
  patientAvgFromInvoices,
  resolveClinicAvgVisitValue,
  type RecoveredSummaryResult,
} from './patient-insights.opportunity.js';

// Recall interval in days by procedure keyword
const RECALL_INTERVALS: { keywords: string[]; days: number }[] = [
  { keywords: ['scaling', 'polishing', 'cleaning', 'prophylaxis'], days: 180 },
  { keywords: ['root canal', 'rct', 'endodontic'], days: 365 },
  { keywords: ['crown', 'bridge', 'cap'], days: 90 },
  { keywords: ['ortho', 'aligner', 'brace', 'invisalign'], days: 30 },
  { keywords: ['implant'], days: 90 },
  { keywords: ['extraction', 'removal'], days: 30 },
  { keywords: ['filling', 'restoration', 'composite', 'amalgam'], days: 180 },
  { keywords: ['checkup', 'check-up', 'examination', 'review'], days: 180 },
  { keywords: ['whitening', 'bleaching'], days: 365 },
];

const DEFAULT_RECALL_DAYS = 180;

const PATIENT_SCORE_SELECT = {
  id: true,
  branch_id: true,
  date_of_birth: true,
  gender: true,
  appointments: {
    orderBy: { appointment_date: 'desc' as const },
    take: 20,
    select: {
      id: true,
      appointment_date: true,
      start_time: true,
      status: true,
      created_at: true,
    },
  },
  treatments: {
    orderBy: { created_at: 'desc' as const },
    take: 10,
    select: {
      id: true,
      procedure: true,
      status: true,
      cost: true,
      created_at: true,
    },
  },
  treatment_plans: {
    where: { status: 'proposed' as const },
    orderBy: { created_at: 'desc' as const },
    take: 5,
    select: {
      id: true,
      title: true,
      total_estimated_cost: true,
      created_at: true,
      items: {
        select: { procedure: true, urgency: true, estimated_cost: true },
      },
    },
  },
  invoices: {
    orderBy: { created_at: 'desc' as const },
    take: 5,
    select: { id: true, created_at: true, total_amount: true },
  },
};

type PatientScoreInput = {
  id: string;
  branch_id: string;
  date_of_birth?: Date | null;
  appointments: { id: string; appointment_date: Date; start_time: string; status: string; created_at: Date }[];
  treatments: { id: string; procedure: string; status: string; cost: unknown; created_at: Date }[];
  treatment_plans: { id: string; title: string; total_estimated_cost: unknown; created_at: Date; items: { procedure: string; urgency: string | null; estimated_cost: unknown }[] }[];
  invoices: { id: string; created_at: Date; total_amount: unknown }[];
};

type ExistingWindowState = {
  recall_window_start: Date | null;
  recall_status: string | null;
  churn_window_start: Date | null;
  churn_status: string | null;
  churn_retry_after: Date | null;
};

function getRecallDays(procedure: string): number {
  const lower = procedure.toLowerCase();
  for (const entry of RECALL_INTERVALS) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.days;
  }
  return DEFAULT_RECALL_DAYS;
}

function riskLevel(score: number): string {
  if (score >= 65) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

@Injectable()
export class PatientInsightsService {
  private readonly logger = new Logger(PatientInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ── Nightly auto-compute for every active clinic ──
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async computeAllClinics() {
    const clinics = await this.prisma.clinic.findMany({
      where: { is_suspended: false },
      select: { id: true },
    });
    for (const clinic of clinics) {
      try {
        await this.computeForClinic(clinic.id, undefined, 'cron');
      } catch (err) {
        this.logger.error(`Nightly insight compute failed for clinic ${clinic.id}`, err);
      }
    }
  }

  async computeForClinic(
    clinicId: string,
    branchId?: string,
    triggeredBy: 'manual' | 'cron' | 'event' = 'manual',
  ): Promise<{ batch_id: string; patient_count: number }> {
    const batch = await this.prisma.insightComputationBatch.create({
      data: {
        clinic_id: clinicId,
        branch_id: branchId ?? null,
        status: 'running',
        triggered_by: triggeredBy,
      },
    });

    try {
      const where = branchId
        ? { clinic_id: clinicId, branch_id: branchId }
        : { clinic_id: clinicId };

      const patients = await this.prisma.patient.findMany({
        where,
        select: PATIENT_SCORE_SELECT,
      });

      const now = new Date();

      const existingScores = await this.prisma.patientInsightScore.findMany({
        where: { clinic_id: clinicId, patient_id: { in: patients.map((p) => p.id) } },
        select: {
          patient_id: true,
          recall_window_start: true,
          recall_status: true,
          churn_window_start: true,
          churn_status: true,
          churn_retry_after: true,
        },
      });
      const existingMap = new Map(existingScores.map((s) => [s.patient_id, s]));

      const CHUNK = 50;
      for (let i = 0; i < patients.length; i += CHUNK) {
        await Promise.all(
          patients.slice(i, i + CHUNK).map((patient) =>
            this.upsertPatientScore(clinicId, patient, existingMap.get(patient.id), now, batch.id),
          ),
        );
      }

      await this.prisma.insightComputationBatch.update({
        where: { id: batch.id },
        data: { status: 'completed', completed_at: now, patient_count: patients.length },
      });

      return { batch_id: batch.id, patient_count: patients.length };
    } catch (err) {
      await this.prisma.insightComputationBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', completed_at: new Date(), error_message: String(err).slice(0, 500) },
      });
      throw err;
    }
  }

  /** Re-score a single patient after an appointment change (fire-and-forget). */
  async computeForPatient(clinicId: string, patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId },
      select: PATIENT_SCORE_SELECT,
    });
    if (!patient) return;

    const existing = await this.prisma.patientInsightScore.findUnique({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
      select: {
        recall_window_start: true,
        recall_status: true,
        churn_window_start: true,
        churn_status: true,
        churn_retry_after: true,
      },
    });

    await this.upsertPatientScore(clinicId, patient, existing ?? undefined, new Date(), null);
  }

  /**
   * When a patient books after recall/inactive outreach, record attribution for ROI tracking.
   * Only sets each side once (first attributed booking wins).
   */
  async attributeBookingAfterOutreach(
    clinicId: string,
    patientId: string,
    appointmentId: string,
  ): Promise<void> {
    const score = await this.prisma.patientInsightScore.findUnique({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
    });
    if (!score) return;

    const now = new Date();
    const windowMs = OUTREACH_ATTRIBUTION_DAYS * MS_PER_DAY;
    const update: Record<string, unknown> = {};

    if (
      score.recall_last_contacted_at &&
      !score.recall_booked_after_outreach_at &&
      now.getTime() - new Date(score.recall_last_contacted_at).getTime() <= windowMs
    ) {
      update.recall_booked_after_outreach_at = now;
      update.recall_booked_appointment_id = appointmentId;
    }

    if (
      score.churn_last_contacted_at &&
      !score.churn_booked_after_outreach_at &&
      now.getTime() - new Date(score.churn_last_contacted_at).getTime() <= windowMs
    ) {
      update.churn_booked_after_outreach_at = now;
      update.churn_booked_appointment_id = appointmentId;
    }

    if (Object.keys(update).length === 0) return;

    await this.prisma.patientInsightScore.update({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
      data: update,
    });
  }

  /**
   * When a high/medium no-show-risk patient checks in or completes their appointment,
   * stamp the attendance timestamp for recovery tracking. First attendance wins.
   */
  async attributeNoShowAttendance(
    clinicId: string,
    patientId: string,
    appointmentId: string,
  ): Promise<void> {
    const score = await this.prisma.patientInsightScore.findUnique({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
      select: { no_show_risk: true, no_show_attended_at: true },
    });

    if (!score) return;
    if (score.no_show_attended_at) return; // already attributed
    if (score.no_show_risk !== 'high' && score.no_show_risk !== 'medium') return;

    await this.prisma.patientInsightScore.update({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
      data: {
        no_show_attended_at: new Date(),
        no_show_attended_appointment_id: appointmentId,
      },
    });
  }

  /**
   * Stamp a patient return after outreach when they come back without a prior booking stamp.
   * Triggers: issued invoice (walk-in bill), finalized clinical visit, completed treatment.
   * Recall/inactive require contact within the attribution window; no-show uses current risk level.
   * No appointment ID is stored for these paths.
   */
  async attributeWalkInAfterOutreach(clinicId: string, patientId: string): Promise<void> {
    const score = await this.prisma.patientInsightScore.findUnique({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
      select: {
        recall_last_contacted_at: true,
        recall_booked_after_outreach_at: true,
        churn_last_contacted_at: true,
        churn_booked_after_outreach_at: true,
        no_show_risk: true,
        no_show_attended_at: true,
      },
    });
    if (!score) return;

    const now = new Date();
    const windowMs = OUTREACH_ATTRIBUTION_DAYS * MS_PER_DAY;
    const update: Record<string, unknown> = {};

    if (
      score.recall_last_contacted_at &&
      !score.recall_booked_after_outreach_at &&
      now.getTime() - new Date(score.recall_last_contacted_at).getTime() <= windowMs
    ) {
      update.recall_booked_after_outreach_at = now;
      // no appointment — walk-in
    }

    if (
      score.churn_last_contacted_at &&
      !score.churn_booked_after_outreach_at &&
      now.getTime() - new Date(score.churn_last_contacted_at).getTime() <= windowMs
    ) {
      update.churn_booked_after_outreach_at = now;
      // no appointment — walk-in
    }

    if (
      !score.no_show_attended_at &&
      (score.no_show_risk === 'high' || score.no_show_risk === 'medium')
    ) {
      update.no_show_attended_at = now;
      // no appointment — walk-in
    }

    if (Object.keys(update).length === 0) return;

    await this.prisma.patientInsightScore.update({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
      data: update,
    });
  }

  /** Stamp last_contacted_at after a campaign send for recall/inactive segments. */
  async stampCampaignContacts(
    clinicId: string,
    patientIds: string[],
    type: 'recall' | 'churn',
  ): Promise<void> {
    if (patientIds.length === 0) return;
    const now = new Date();
    const data =
      type === 'recall'
        ? { recall_status: 'contacted', recall_last_contacted_at: now }
        : { churn_status: 'contacted', churn_last_contacted_at: now };

    await this.prisma.patientInsightScore.updateMany({
      where: { clinic_id: clinicId, patient_id: { in: patientIds } },
      data,
    });
  }

  private applyWindowManagement(
    score: ReturnType<PatientInsightsService['scorePatient']>,
    ex: ExistingWindowState | undefined,
    now: Date,
  ) {
    const hasFutureAppt = !!(score.churn_factors as { has_future_appt?: boolean })?.has_future_appt;

    let recallWindowStart: Date | null = null;
    let recallStatus: string | null = ex?.recall_status ?? null;

    if (score.recall_due) {
      recallWindowStart = ex?.recall_window_start ?? now;
      const windowAge = (now.getTime() - recallWindowStart.getTime()) / MS_PER_DAY;
      if (windowAge > INSIGHT_WINDOW_DAYS) {
        recallStatus = 'moved_inactive';
      }
    } else {
      recallWindowStart = null;
      recallStatus = null;
    }

    let churnWindowStart: Date | null = ex?.churn_window_start ?? null;
    let churnStatus: string | null = ex?.churn_status ?? null;
    let churnRetryAfter: Date | null = ex?.churn_retry_after ?? null;

    const isChurnEligible =
      !hasFutureAppt &&
      (score.churn_risk !== 'low' || recallStatus === 'moved_inactive');

    if (isChurnEligible) {
      if (churnRetryAfter && churnRetryAfter > now) {
        // Still in retry-after lockout
      } else if (!churnWindowStart) {
        churnWindowStart = now;
        churnStatus = null;
        churnRetryAfter = null;
      } else {
        const windowAge = (now.getTime() - churnWindowStart.getTime()) / MS_PER_DAY;
        if (windowAge > INSIGHT_WINDOW_DAYS && churnStatus !== 'declined') {
          churnRetryAfter = new Date(now.getTime() + 365 * MS_PER_DAY);
          churnWindowStart = null;
          churnStatus = null;
        }
      }
    } else {
      churnWindowStart = null;
      churnStatus = null;
      if (hasFutureAppt) churnRetryAfter = ex?.churn_retry_after ?? null;
    }

    return {
      recallWindowStart,
      recallStatus,
      churnWindowStart,
      churnStatus,
      churnRetryAfter,
    };
  }

  private async upsertPatientScore(
    clinicId: string,
    patient: PatientScoreInput,
    ex: ExistingWindowState | undefined,
    now: Date,
    batchId: string | null,
  ) {
    const score = this.scorePatient(patient, now);
    const windows = this.applyWindowManagement(score, ex, now);

    return this.prisma.patientInsightScore.upsert({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patient.id } },
      create: {
        clinic_id: clinicId,
        branch_id: patient.branch_id,
        patient_id: patient.id,
        batch_id: batchId,
        ...score,
        recall_window_start: windows.recallWindowStart,
        recall_status: windows.recallStatus,
        churn_window_start: windows.churnWindowStart,
        churn_status: windows.churnStatus,
        churn_retry_after: windows.churnRetryAfter,
      },
      update: {
        branch_id: patient.branch_id,
        batch_id: batchId,
        computed_at: now,
        ...score,
        recall_window_start: windows.recallWindowStart,
        recall_status: windows.recallStatus,
        churn_window_start: windows.churnWindowStart,
        churn_status: windows.churnStatus,
        churn_retry_after: windows.churnRetryAfter,
      },
    });
  }

  private scorePatient(patient: PatientScoreInput, now: Date) {
    const past = patient.appointments.filter((a) => new Date(a.appointment_date) < now);
    const future = patient.appointments.filter(
      (a) => new Date(a.appointment_date) >= now && a.status !== 'cancelled',
    );
    const noShowCount = past.filter((a) => a.status === 'no_show').length;
    const cancelCount = past.filter((a) => a.status === 'cancelled').length;
    const completedVisits = past.filter((a) => a.status === 'completed');

    const recentNoShow = past
      .filter((a) => a.status === 'no_show')
      .some((a) => (now.getTime() - new Date(a.appointment_date).getTime()) / MS_PER_DAY < 90);
    let noShowScore = 0;
    if (future.length > 0) {
      if (noShowCount >= 3) noShowScore += 50;
      else if (noShowCount === 2) noShowScore += 35;
      else if (noShowCount === 1) noShowScore += 20;
      if (cancelCount >= 3) noShowScore += 15;
      if (recentNoShow) noShowScore += 15;
      noShowScore = Math.min(noShowScore, 100);
    }

    let recallDue = false;
    let recallDueDays: number | null = null;
    let recallTreatment: string | null = null;
    let recallLastDate: Date | null = null;

    const completedTreatments = patient.treatments.filter((t) => t.status === 'completed');
    if (completedTreatments.length > 0) {
      const lastTreatment = completedTreatments[0]!;
      const interval = getRecallDays(lastTreatment.procedure);
      const lastDate = new Date(lastTreatment.created_at);
      const dueDate = new Date(lastDate.getTime() + interval * MS_PER_DAY);
      const daysUntilDue = Math.round((dueDate.getTime() - now.getTime()) / MS_PER_DAY);
      recallLastDate = lastDate;
      recallTreatment = lastTreatment.procedure;
      if (daysUntilDue <= 14 && future.length === 0) {
        recallDue = true;
        recallDueDays = -daysUntilDue;
      }
    }

    const lastVisitDate =
      completedVisits.length > 0
        ? new Date(Math.max(...completedVisits.map((a) => new Date(a.appointment_date).getTime())))
        : null;
    const daysSinceVisit = lastVisitDate
      ? Math.round((now.getTime() - lastVisitDate.getTime()) / MS_PER_DAY)
      : null;

    let churnScore = 0;
    if (lastVisitDate && future.length === 0) {
      if (daysSinceVisit! > 730) churnScore += 70;
      else if (daysSinceVisit! > 548) churnScore += 50;
      if (patient.invoices.length === 0) churnScore += 10;
    }
    churnScore = Math.min(churnScore, 100);

    let conversionScore = 0;
    let conversionInterest: string | null = null;
    let conversionValue = 0;

    if (patient.treatment_plans.length > 0) {
      const plan = patient.treatment_plans[0]!;
      const ageDays = Math.round((now.getTime() - new Date(plan.created_at).getTime()) / MS_PER_DAY);
      conversionScore = ageDays > 30 ? 75 : ageDays > 14 ? 60 : 40;
      conversionValue = Number(plan.total_estimated_cost) || 0;
      const firstItem = plan.items[0];
      conversionInterest = firstItem
        ? firstItem.procedure.split(' ').slice(0, 3).join(' ')
        : plan.title;
    }

    let confidence = 0;
    if (patient.appointments.length >= 1) confidence += 25;
    if (patient.treatments.length >= 1) confidence += 25;
    if (patient.appointments.length >= 3) confidence += 25;
    if (patient.date_of_birth) confidence += 25;

    return {
      no_show_score: noShowScore,
      no_show_risk: riskLevel(noShowScore),
      no_show_factors: { no_show_count: noShowCount, cancel_count: cancelCount, recent_no_show: recentNoShow },
      recall_due: recallDue,
      recall_due_days: recallDueDays,
      recall_treatment: recallTreatment,
      recall_last_date: recallLastDate,
      churn_score: churnScore,
      churn_risk: riskLevel(churnScore),
      days_since_visit: daysSinceVisit,
      churn_factors: { days_since_visit: daysSinceVisit, has_future_appt: future.length > 0 },
      conversion_score: conversionScore,
      conversion_interest: conversionInterest,
      conversion_value: conversionValue,
      confidence_score: confidence,
    };
  }

  async getSummary(clinicId: string, branchId?: string) {
    const now = new Date();
    const cooldown = campaignCooldownBefore(now);

    const [
      noShowTotal,
      recallTotal,
      churnTotal,
      churnHigh,
      churnMed,
      conversion,
      outreachRecent,
      attributedBookings,
      aggregated,
      lastBatch,
      uniqueAtRisk,
    ] = await Promise.all([
      this.prisma.patientInsightScore.count({
        where: buildNoShowListWhere(clinicId, branchId),
      }),
      this.prisma.patientInsightScore.count({
        where: buildRecallListWhere(clinicId, branchId, now),
      }),
      this.prisma.patientInsightScore.count({
        where: buildChurnListWhere(clinicId, branchId, now),
      }),
      this.prisma.patientInsightScore.count({
        where: { ...buildChurnListWhere(clinicId, branchId, now), churn_risk: 'high' },
      }),
      this.prisma.patientInsightScore.count({
        where: { ...buildChurnListWhere(clinicId, branchId, now), churn_risk: 'medium' },
      }),
      this.prisma.patientInsightScore.count({
        where: buildListWhereByType('conversion', clinicId, branchId, now),
      }),
      this.prisma.patientInsightScore.count({
        where: {
          ...buildInsightBaseWhere(clinicId, branchId),
          OR: [
            { recall_last_contacted_at: { gte: cooldown } },
            { churn_last_contacted_at: { gte: cooldown } },
          ],
        },
      }),
      this.prisma.patientInsightScore.count({
        where: {
          ...buildInsightBaseWhere(clinicId, branchId),
          OR: [
            { recall_booked_after_outreach_at: { not: null } },
            { churn_booked_after_outreach_at: { not: null } },
            { no_show_attended_at: { not: null } },
          ],
        },
      }),
      this.prisma.patientInsightScore.aggregate({
        where: buildInsightBaseWhere(clinicId, branchId),
        _sum: { conversion_value: true },
        _avg: { confidence_score: true },
      }),
      this.prisma.insightComputationBatch.findFirst({
        where: { clinic_id: clinicId, status: 'completed' },
        orderBy: { completed_at: 'desc' },
        select: { completed_at: true, patient_count: true },
      }),
      this.countUniqueAtRiskPatients(clinicId, branchId, now),
    ]);

    const potentialRevenue = Number(aggregated._sum.conversion_value ?? 0);
    const avgConfidence = Math.round(aggregated._avg.confidence_score ?? 0);

    const noShowHigh = await this.prisma.patientInsightScore.count({
      where: { ...buildNoShowListWhere(clinicId, branchId), no_show_risk: 'high' },
    });
    const noShowMed = noShowTotal - noShowHigh;

    return {
      no_show: { high: noShowHigh, medium: noShowMed, total: noShowTotal },
      recall: { total: recallTotal },
      churn: { high: churnHigh, medium: churnMed, total: churnTotal },
      conversion: { total: conversion, potential_revenue: potentialRevenue },
      total_at_risk: uniqueAtRisk,
      outreach_recent: outreachRecent,
      attributed_bookings: attributedBookings,
      attribution_window_days: OUTREACH_ATTRIBUTION_DAYS,
      campaign_cooldown_days: CAMPAIGN_COOLDOWN_DAYS,
      confidence_score: avgConfidence,
      last_computed_at: lastBatch?.completed_at ?? null,
    };
  }

  async getList(clinicId: string, dto: QueryInsightsDto) {
    const { branch_id, type, limit = 10, offset = 0 } = dto;
    const now = new Date();
    const effectiveType = type ?? 'no_show';
    const where = buildListWhereByType(effectiveType, clinicId, branch_id, now);

    const orderByType: Record<string, Record<string, 'desc'>> = {
      no_show: { no_show_score: 'desc' },
      recall: { recall_due_days: 'desc' },
      churn: { churn_score: 'desc' },
      conversion: { conversion_score: 'desc' },
    };
    const orderBy = orderByType[effectiveType];

    const [rows, total] = await Promise.all([
      this.prisma.patientInsightScore.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          patient: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              phone: true,
              profile_photo_url: true,
              appointments: {
                where: {
                  appointment_date: { gte: clinicDateToUtcMidnight(getClinicTodayDateString()) },
                  status: { not: 'cancelled' },
                },
                orderBy: { appointment_date: 'asc' },
                take: 1,
                select: { appointment_date: true, start_time: true },
              },
            },
          },
        },
      }),
      this.prisma.patientInsightScore.count({ where }),
    ]);

    return { data: rows, total, limit, offset };
  }

  async getEligibleCount(clinicId: string, type: 'recall' | 'churn', branchId?: string) {
    const now = new Date();
    const where = buildEligibleWhere(type, clinicId, branchId, now);
    const [eligible, listTotal] = await Promise.all([
      this.prisma.patientInsightScore.count({ where }),
      this.prisma.patientInsightScore.count({
        where:
          type === 'recall'
            ? buildRecallListWhere(clinicId, branchId, now)
            : buildChurnListWhere(clinicId, branchId, now),
      }),
    ]);
    return { type, eligible, list_total: listTotal, cooldown_days: CAMPAIGN_COOLDOWN_DAYS };
  }

  async getPatientScore(clinicId: string, patientId: string) {
    const score = await this.prisma.patientInsightScore.findUnique({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
    });
    if (!score) throw new NotFoundException('No insight score found for this patient. Run a compute first.');
    return score;
  }

  async getBatchStatus(batchId: string, clinicId: string) {
    const batch = await this.prisma.insightComputationBatch.findFirst({
      where: { id: batchId, clinic_id: clinicId },
      select: { id: true, status: true, patient_count: true, started_at: true, completed_at: true, error_message: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async getLatestBatch(clinicId: string) {
    return this.prisma.insightComputationBatch.findFirst({
      where: { clinic_id: clinicId },
      orderBy: { started_at: 'desc' },
      select: { id: true, status: true, patient_count: true, started_at: true, completed_at: true },
    });
  }

  /** Clinic-wide average visit value from paid invoices, with ₹1,500 fallback for new clinics. */
  async getClinicAvgVisitValue(clinicId: string, branchId?: string): Promise<number> {
    const clinicAvgResult = await this.prisma.invoice.aggregate({
      where: buildRevenueInvoiceWhere(clinicId, branchId),
      _avg: { net_amount: true },
    });
    return Math.round(resolveClinicAvgVisitValue(Number(clinicAvgResult._avg.net_amount ?? 0)));
  }

  private async countUniqueAtRiskPatients(
    clinicId: string,
    branchId?: string,
    now = new Date(),
  ): Promise<number> {
    const [noShowRows, recallRows, churnRows] = await Promise.all([
      this.prisma.patientInsightScore.findMany({
        where: buildNoShowListWhere(clinicId, branchId),
        select: { patient_id: true },
      }),
      this.prisma.patientInsightScore.findMany({
        where: buildRecallListWhere(clinicId, branchId, now),
        select: { patient_id: true },
      }),
      this.prisma.patientInsightScore.findMany({
        where: buildChurnListWhere(clinicId, branchId, now),
        select: { patient_id: true },
      }),
    ]);
    return dedupeAtRiskBuckets(noShowRows, recallRows, churnRows).totalUniquePatients;
  }

  // ── GET: revenue opportunity — potential value of all at-risk patients ──
  async getOpportunitySummary(clinicId: string, branchId?: string) {
    const now = new Date();
    const clinicDefault = await this.getClinicAvgVisitValue(clinicId, branchId);
    const scoreSelect = buildAtRiskScoreSelect(branchId);

    const [recallRows, noShowRows, churnRows] = await Promise.all([
      this.prisma.patientInsightScore.findMany({
        where: buildRecallListWhere(clinicId, branchId, now),
        select: scoreSelect,
      }),
      this.prisma.patientInsightScore.findMany({
        where: buildNoShowListWhere(clinicId, branchId),
        select: { ...scoreSelect, no_show_risk: true },
      }),
      this.prisma.patientInsightScore.findMany({
        where: buildChurnListWhere(clinicId, branchId, now),
        select: scoreSelect,
      }),
    ]);

    const buckets = dedupeAtRiskBuckets(noShowRows, recallRows, churnRows);
    const values = computeOpportunityValues(buckets, clinicDefault);

    return {
      ...values,
      clinic_avg_visit_value: clinicDefault,
    };
  }

  // ── GET: recovery summary — value actually brought in from at-risk patients ──
  async getRecoveredSummary(clinicId: string, branchId?: string): Promise<RecoveredSummaryResult> {
    const now = new Date();
    const PERIOD_DAYS = 90;
    const windowStart = new Date(now.getTime() - PERIOD_DAYS * MS_PER_DAY);
    const clinicDefault = await this.getClinicAvgVisitValue(clinicId, branchId);

    const invoiceFilter = buildRevenueInvoiceWhere(clinicId, branchId);
    const invoiceSelect  = { net_amount: true, created_at: true } as const;
    const baseWhere      = buildInsightBaseWhere(clinicId, branchId);

    const patientWithInvoices = {
      select: {
        invoices: {
          where: invoiceFilter,
          orderBy: { created_at: 'asc' as const },
          take: 20,
          select: invoiceSelect,
        },
      },
    };

    // Fetch all three buckets in parallel
    const [recallRows, churnRows, noShowRows] = await Promise.all([
      this.prisma.patientInsightScore.findMany({
        where: { ...baseWhere, recall_booked_after_outreach_at: { gte: windowStart } },
        select: { patient_id: true, recall_booked_after_outreach_at: true, patient: patientWithInvoices },
      }),
      this.prisma.patientInsightScore.findMany({
        where: { ...baseWhere, churn_booked_after_outreach_at: { gte: windowStart } },
        select: { patient_id: true, churn_booked_after_outreach_at: true, patient: patientWithInvoices },
      }),
      this.prisma.patientInsightScore.findMany({
        where: { ...baseWhere, no_show_attended_at: { gte: windowStart } },
        select: { patient_id: true, no_show_attended_at: true, patient: patientWithInvoices },
      }),
    ]);

    // Deduplicate: a patient in recall or churn should not also appear in no-show totals.
    // Priority: recall > inactive > no-show (mirrors opportunity deduplication).
    const recalledIds  = new Set(recallRows.map((r) => r.patient_id));
    const inactiveIds  = new Set(churnRows.map((r) => r.patient_id));
    const noShowUnique = noShowRows.filter(
      (r) => !recalledIds.has(r.patient_id) && !inactiveIds.has(r.patient_id),
    );

    type InvoiceRow = { net_amount: unknown; created_at: Date };

    const computeBucket = <T extends { patient?: { invoices: InvoiceRow[] } | null }>(
      rows: T[],
      stampDateFn: (r: T) => Date,
    ) => {
      let recovered = 0;
      let expected  = 0;

      for (const row of rows) {
        const stampDate  = stampDateFn(row);
        const allInvoices: InvoiceRow[] = row.patient?.invoices ?? [];

        // Invoices on or after stamp = revenue attributed to recovery
        const afterStamp = allInvoices.filter((i) => i.created_at >= stampDate);
        const patientRecovered = afterStamp.reduce((s, i) => s + Number(i.net_amount), 0);
        recovered += Math.min(patientRecovered, MAX_VISIT_VALUE_PER_PATIENT);

        // Pre-stamp history = what we expected them to spend (historical avg)
        const beforeStamp = allInvoices.filter((i) => i.created_at < stampDate);
        expected += patientAvgFromInvoices(beforeStamp, clinicDefault);
      }

      return { count: rows.length, recovered: Math.round(recovered), expected: Math.round(expected) };
    };

    const recallBucket   = computeBucket(recallRows,   (r) => r.recall_booked_after_outreach_at!);
    const inactiveBucket = computeBucket(churnRows,    (r) => r.churn_booked_after_outreach_at!);
    const noShowBucket   = computeBucket(noShowUnique, (r) => r.no_show_attended_at!);

    const totalRecovered = recallBucket.recovered + inactiveBucket.recovered + noShowBucket.recovered;
    const totalExpected  = recallBucket.expected  + inactiveBucket.expected  + noShowBucket.expected;
    const totalPatients  = recallBucket.count     + inactiveBucket.count     + noShowBucket.count;

    return {
      recall:   recallBucket,
      inactive: inactiveBucket,
      no_show:  noShowBucket,
      total_patients_returned: totalPatients,
      total_recovered:  totalRecovered,
      total_expected:   totalExpected,
      exceeded: totalPatients > 0 && totalRecovered > totalExpected,
      period_days: PERIOD_DAYS,
    };
  }

  async recordAction(
    clinicId: string,
    patientId: string,
    dto: RecordActionDto,
    userId?: string,
  ) {
    const score = await this.prisma.patientInsightScore.findUnique({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
    });
    if (!score) throw new NotFoundException('No insight score found for this patient.');

    const recallActions = ['contacted', 'snooze', 'move_inactive'] as const;
    const churnActions = ['contacted', 'snooze', 'decline'] as const;

    if (dto.type === 'recall' && !recallActions.includes(dto.action as (typeof recallActions)[number])) {
      throw new BadRequestException(`Action "${dto.action}" is not valid for Due for a Check-up insights.`);
    }
    if (dto.type === 'churn' && !churnActions.includes(dto.action as (typeof churnActions)[number])) {
      throw new BadRequestException(`Action "${dto.action}" is not valid for Inactive Patient insights.`);
    }

    const now = new Date();
    const update: Record<string, unknown> = {};

    if (dto.type === 'recall') {
      if (dto.action === 'contacted') {
        update.recall_status = 'contacted';
        update.recall_last_contacted_at = now;
      } else if (dto.action === 'snooze') {
        const days = Math.min(dto.snooze_days ?? 7, 30);
        const windowEnd = score.recall_window_start
          ? new Date(score.recall_window_start.getTime() + INSIGHT_WINDOW_DAYS * MS_PER_DAY)
          : new Date(now.getTime() + days * MS_PER_DAY);
        const snoozeUntil = new Date(Math.min(now.getTime() + days * MS_PER_DAY, windowEnd.getTime()));
        update.recall_status = 'snoozed';
        update.recall_snoozed_until = snoozeUntil;
      } else if (dto.action === 'move_inactive') {
        update.recall_status = 'moved_inactive';
        if (!score.churn_window_start) {
          update.churn_window_start = now;
          update.churn_status = null;
        }
      }
    } else if (dto.action === 'contacted') {
      update.churn_status = 'contacted';
      update.churn_last_contacted_at = now;
    } else if (dto.action === 'snooze') {
      const days = Math.min(dto.snooze_days ?? 7, 30);
      const windowEnd = score.churn_window_start
        ? new Date(score.churn_window_start.getTime() + INSIGHT_WINDOW_DAYS * MS_PER_DAY)
        : new Date(now.getTime() + days * MS_PER_DAY);
      const snoozeUntil = new Date(Math.min(now.getTime() + days * MS_PER_DAY, windowEnd.getTime()));
      update.churn_status = 'snoozed';
      update.churn_snoozed_until = snoozeUntil;
    } else if (dto.action === 'decline') {
      update.churn_status = 'declined';
      update.churn_retry_after = new Date(now.getTime() + 365 * MS_PER_DAY);
      update.churn_window_start = null;
    }

    const updated = await this.prisma.patientInsightScore.update({
      where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
      data: update,
    });

    this.auditLog
      .log({
        clinic_id: clinicId,
        user_id: userId,
        action: 'insight_action',
        entity: 'patient_insight',
        entity_id: patientId,
        metadata: {
          insight_type: dto.type,
          action: dto.action,
          snooze_days: dto.snooze_days ?? null,
        },
      })
      .catch((err) => this.logger.warn(`Insight action audit failed: ${(err as Error).message}`));

    return updated;
  }
}
