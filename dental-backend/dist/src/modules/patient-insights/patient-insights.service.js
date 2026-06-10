"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PatientInsightsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientInsightsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const audit_log_service_js_1 = require("../audit-log/audit-log.service.js");
const clinic_timezone_util_js_1 = require("../../common/utils/clinic-timezone.util.js");
const patient_insights_filters_js_1 = require("./patient-insights.filters.js");
const patient_insights_opportunity_js_1 = require("./patient-insights.opportunity.js");
const RECALL_INTERVALS = [
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
        orderBy: { appointment_date: 'desc' },
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
        orderBy: { created_at: 'desc' },
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
        where: { status: 'proposed' },
        orderBy: { created_at: 'desc' },
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
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { id: true, created_at: true, total_amount: true },
    },
};
function getRecallDays(procedure) {
    const lower = procedure.toLowerCase();
    for (const entry of RECALL_INTERVALS) {
        if (entry.keywords.some((k) => lower.includes(k)))
            return entry.days;
    }
    return DEFAULT_RECALL_DAYS;
}
function riskLevel(score) {
    if (score >= 65)
        return 'high';
    if (score >= 35)
        return 'medium';
    return 'low';
}
let PatientInsightsService = PatientInsightsService_1 = class PatientInsightsService {
    prisma;
    auditLog;
    logger = new common_1.Logger(PatientInsightsService_1.name);
    constructor(prisma, auditLog) {
        this.prisma = prisma;
        this.auditLog = auditLog;
    }
    async computeAllClinics() {
        const clinics = await this.prisma.clinic.findMany({
            where: { is_suspended: false },
            select: { id: true },
        });
        for (const clinic of clinics) {
            try {
                await this.computeForClinic(clinic.id, undefined, 'cron');
            }
            catch (err) {
                this.logger.error(`Nightly insight compute failed for clinic ${clinic.id}`, err);
            }
        }
    }
    async computeForClinic(clinicId, branchId, triggeredBy = 'manual') {
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
                await Promise.all(patients.slice(i, i + CHUNK).map((patient) => this.upsertPatientScore(clinicId, patient, existingMap.get(patient.id), now, batch.id)));
            }
            await this.prisma.insightComputationBatch.update({
                where: { id: batch.id },
                data: { status: 'completed', completed_at: now, patient_count: patients.length },
            });
            return { batch_id: batch.id, patient_count: patients.length };
        }
        catch (err) {
            await this.prisma.insightComputationBatch.update({
                where: { id: batch.id },
                data: { status: 'failed', completed_at: new Date(), error_message: String(err).slice(0, 500) },
            });
            throw err;
        }
    }
    async computeForPatient(clinicId, patientId) {
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, clinic_id: clinicId },
            select: PATIENT_SCORE_SELECT,
        });
        if (!patient)
            return;
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
    async attributeBookingAfterOutreach(clinicId, patientId, appointmentId) {
        const score = await this.prisma.patientInsightScore.findUnique({
            where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        });
        if (!score)
            return;
        const now = new Date();
        const windowMs = patient_insights_filters_js_1.OUTREACH_ATTRIBUTION_DAYS * patient_insights_filters_js_1.MS_PER_DAY;
        const update = {};
        if (score.recall_last_contacted_at &&
            !score.recall_booked_after_outreach_at &&
            now.getTime() - new Date(score.recall_last_contacted_at).getTime() <= windowMs) {
            update.recall_booked_after_outreach_at = now;
            update.recall_booked_appointment_id = appointmentId;
        }
        if (score.churn_last_contacted_at &&
            !score.churn_booked_after_outreach_at &&
            now.getTime() - new Date(score.churn_last_contacted_at).getTime() <= windowMs) {
            update.churn_booked_after_outreach_at = now;
            update.churn_booked_appointment_id = appointmentId;
        }
        if (Object.keys(update).length === 0)
            return;
        await this.prisma.patientInsightScore.update({
            where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
            data: update,
        });
    }
    async attributeNoShowAttendance(clinicId, patientId, appointmentId) {
        const score = await this.prisma.patientInsightScore.findUnique({
            where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
            select: { no_show_risk: true, no_show_attended_at: true },
        });
        if (!score)
            return;
        if (score.no_show_attended_at)
            return;
        if (score.no_show_risk !== 'high' && score.no_show_risk !== 'medium')
            return;
        await this.prisma.patientInsightScore.update({
            where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
            data: {
                no_show_attended_at: new Date(),
                no_show_attended_appointment_id: appointmentId,
            },
        });
    }
    async attributeWalkInAfterOutreach(clinicId, patientId, effectiveAt) {
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
        if (!score)
            return;
        const stamp = new Date(effectiveAt ?? new Date());
        stamp.setHours(0, 0, 0, 0);
        const windowMs = patient_insights_filters_js_1.OUTREACH_ATTRIBUTION_DAYS * patient_insights_filters_js_1.MS_PER_DAY;
        const now = new Date();
        const update = {};
        if (score.recall_last_contacted_at &&
            !score.recall_booked_after_outreach_at &&
            now.getTime() - new Date(score.recall_last_contacted_at).getTime() <= windowMs) {
            update.recall_booked_after_outreach_at = stamp;
        }
        if (score.churn_last_contacted_at &&
            !score.churn_booked_after_outreach_at &&
            now.getTime() - new Date(score.churn_last_contacted_at).getTime() <= windowMs) {
            update.churn_booked_after_outreach_at = stamp;
        }
        if (!score.no_show_attended_at &&
            (score.no_show_risk === 'high' || score.no_show_risk === 'medium')) {
            update.no_show_attended_at = stamp;
        }
        if (Object.keys(update).length === 0)
            return;
        await this.prisma.patientInsightScore.update({
            where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
            data: update,
        });
    }
    async stampCampaignContacts(clinicId, patientIds, type) {
        if (patientIds.length === 0)
            return;
        const now = new Date();
        const data = type === 'recall'
            ? { recall_status: 'contacted', recall_last_contacted_at: now }
            : { churn_status: 'contacted', churn_last_contacted_at: now };
        await this.prisma.patientInsightScore.updateMany({
            where: { clinic_id: clinicId, patient_id: { in: patientIds } },
            data,
        });
    }
    applyWindowManagement(score, ex, now) {
        const hasFutureAppt = !!score.churn_factors?.has_future_appt;
        let recallWindowStart = null;
        let recallStatus = ex?.recall_status ?? null;
        if (score.recall_due) {
            recallWindowStart = ex?.recall_window_start ?? now;
            const windowAge = (now.getTime() - recallWindowStart.getTime()) / patient_insights_filters_js_1.MS_PER_DAY;
            if (windowAge > patient_insights_filters_js_1.INSIGHT_WINDOW_DAYS) {
                recallStatus = 'moved_inactive';
            }
        }
        else {
            recallWindowStart = null;
            recallStatus = null;
        }
        let churnWindowStart = ex?.churn_window_start ?? null;
        let churnStatus = ex?.churn_status ?? null;
        let churnRetryAfter = ex?.churn_retry_after ?? null;
        const isChurnEligible = !hasFutureAppt &&
            (score.churn_risk !== 'low' || recallStatus === 'moved_inactive');
        if (isChurnEligible) {
            if (churnRetryAfter && churnRetryAfter > now) {
            }
            else if (!churnWindowStart) {
                churnWindowStart = now;
                churnStatus = null;
                churnRetryAfter = null;
            }
            else {
                const windowAge = (now.getTime() - churnWindowStart.getTime()) / patient_insights_filters_js_1.MS_PER_DAY;
                if (windowAge > patient_insights_filters_js_1.INSIGHT_WINDOW_DAYS && churnStatus !== 'declined') {
                    churnRetryAfter = new Date(now.getTime() + 365 * patient_insights_filters_js_1.MS_PER_DAY);
                    churnWindowStart = null;
                    churnStatus = null;
                }
            }
        }
        else {
            churnWindowStart = null;
            churnStatus = null;
            if (hasFutureAppt)
                churnRetryAfter = ex?.churn_retry_after ?? null;
        }
        return {
            recallWindowStart,
            recallStatus,
            churnWindowStart,
            churnStatus,
            churnRetryAfter,
        };
    }
    async upsertPatientScore(clinicId, patient, ex, now, batchId) {
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
    scorePatient(patient, now) {
        const past = patient.appointments.filter((a) => new Date(a.appointment_date) < now);
        const future = patient.appointments.filter((a) => new Date(a.appointment_date) >= now && a.status !== 'cancelled');
        const noShowCount = past.filter((a) => a.status === 'no_show').length;
        const cancelCount = past.filter((a) => a.status === 'cancelled').length;
        const completedVisits = past.filter((a) => a.status === 'completed');
        const recentNoShow = past
            .filter((a) => a.status === 'no_show')
            .some((a) => (now.getTime() - new Date(a.appointment_date).getTime()) / patient_insights_filters_js_1.MS_PER_DAY < 90);
        let noShowScore = 0;
        if (future.length > 0) {
            if (noShowCount >= 3)
                noShowScore += 50;
            else if (noShowCount === 2)
                noShowScore += 35;
            else if (noShowCount === 1)
                noShowScore += 20;
            if (cancelCount >= 3)
                noShowScore += 15;
            if (recentNoShow)
                noShowScore += 15;
            noShowScore = Math.min(noShowScore, 100);
        }
        let recallDue = false;
        let recallDueDays = null;
        let recallTreatment = null;
        let recallLastDate = null;
        const completedTreatments = patient.treatments.filter((t) => t.status === 'completed');
        if (completedTreatments.length > 0) {
            const lastTreatment = completedTreatments[0];
            const interval = getRecallDays(lastTreatment.procedure);
            const lastDate = new Date(lastTreatment.created_at);
            const dueDate = new Date(lastDate.getTime() + interval * patient_insights_filters_js_1.MS_PER_DAY);
            const daysUntilDue = Math.round((dueDate.getTime() - now.getTime()) / patient_insights_filters_js_1.MS_PER_DAY);
            recallLastDate = lastDate;
            recallTreatment = lastTreatment.procedure;
            if (daysUntilDue <= 14 && future.length === 0) {
                recallDue = true;
                recallDueDays = -daysUntilDue;
            }
        }
        const lastVisitDate = completedVisits.length > 0
            ? new Date(Math.max(...completedVisits.map((a) => new Date(a.appointment_date).getTime())))
            : null;
        const daysSinceVisit = lastVisitDate
            ? Math.round((now.getTime() - lastVisitDate.getTime()) / patient_insights_filters_js_1.MS_PER_DAY)
            : null;
        let churnScore = 0;
        if (lastVisitDate && future.length === 0) {
            if (daysSinceVisit > 730)
                churnScore += 70;
            else if (daysSinceVisit > 548)
                churnScore += 50;
            if (patient.invoices.length === 0)
                churnScore += 10;
        }
        churnScore = Math.min(churnScore, 100);
        let conversionScore = 0;
        let conversionInterest = null;
        let conversionValue = 0;
        if (patient.treatment_plans.length > 0) {
            const plan = patient.treatment_plans[0];
            const ageDays = Math.round((now.getTime() - new Date(plan.created_at).getTime()) / patient_insights_filters_js_1.MS_PER_DAY);
            conversionScore = ageDays > 30 ? 75 : ageDays > 14 ? 60 : 40;
            conversionValue = Number(plan.total_estimated_cost) || 0;
            const firstItem = plan.items[0];
            conversionInterest = firstItem
                ? firstItem.procedure.split(' ').slice(0, 3).join(' ')
                : plan.title;
        }
        let confidence = 0;
        if (patient.appointments.length >= 1)
            confidence += 25;
        if (patient.treatments.length >= 1)
            confidence += 25;
        if (patient.appointments.length >= 3)
            confidence += 25;
        if (patient.date_of_birth)
            confidence += 25;
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
    async getSummary(clinicId, branchId) {
        const now = new Date();
        const cooldown = (0, patient_insights_filters_js_1.campaignCooldownBefore)(now);
        const [noShowTotal, recallTotal, churnTotal, churnHigh, churnMed, conversion, outreachRecent, attributedBookings, aggregated, lastBatch, uniqueAtRisk,] = await Promise.all([
            this.prisma.patientInsightScore.count({
                where: (0, patient_insights_filters_js_1.buildNoShowListWhere)(clinicId, branchId),
            }),
            this.prisma.patientInsightScore.count({
                where: (0, patient_insights_filters_js_1.buildRecallListWhere)(clinicId, branchId, now),
            }),
            this.prisma.patientInsightScore.count({
                where: (0, patient_insights_filters_js_1.buildChurnListWhere)(clinicId, branchId, now),
            }),
            this.prisma.patientInsightScore.count({
                where: { ...(0, patient_insights_filters_js_1.buildChurnListWhere)(clinicId, branchId, now), churn_risk: 'high' },
            }),
            this.prisma.patientInsightScore.count({
                where: { ...(0, patient_insights_filters_js_1.buildChurnListWhere)(clinicId, branchId, now), churn_risk: 'medium' },
            }),
            this.prisma.patientInsightScore.count({
                where: (0, patient_insights_filters_js_1.buildListWhereByType)('conversion', clinicId, branchId, now),
            }),
            this.prisma.patientInsightScore.count({
                where: {
                    ...(0, patient_insights_filters_js_1.buildInsightBaseWhere)(clinicId, branchId),
                    OR: [
                        { recall_last_contacted_at: { gte: cooldown } },
                        { churn_last_contacted_at: { gte: cooldown } },
                    ],
                },
            }),
            this.prisma.patientInsightScore.count({
                where: {
                    ...(0, patient_insights_filters_js_1.buildInsightBaseWhere)(clinicId, branchId),
                    OR: [
                        { recall_booked_after_outreach_at: { not: null } },
                        { churn_booked_after_outreach_at: { not: null } },
                        { no_show_attended_at: { not: null } },
                    ],
                },
            }),
            this.prisma.patientInsightScore.aggregate({
                where: (0, patient_insights_filters_js_1.buildInsightBaseWhere)(clinicId, branchId),
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
            where: { ...(0, patient_insights_filters_js_1.buildNoShowListWhere)(clinicId, branchId), no_show_risk: 'high' },
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
            attribution_window_days: patient_insights_filters_js_1.OUTREACH_ATTRIBUTION_DAYS,
            campaign_cooldown_days: patient_insights_filters_js_1.CAMPAIGN_COOLDOWN_DAYS,
            confidence_score: avgConfidence,
            last_computed_at: lastBatch?.completed_at ?? null,
        };
    }
    async getList(clinicId, dto) {
        const { branch_id, type, limit = 10, offset = 0 } = dto;
        const now = new Date();
        const effectiveType = type ?? 'no_show';
        const where = (0, patient_insights_filters_js_1.buildListWhereByType)(effectiveType, clinicId, branch_id, now);
        const orderByType = {
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
                                    appointment_date: { gte: (0, clinic_timezone_util_js_1.clinicDateToUtcMidnight)((0, clinic_timezone_util_js_1.getClinicTodayDateString)()) },
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
    async getEligibleCount(clinicId, type, branchId) {
        const now = new Date();
        const where = (0, patient_insights_filters_js_1.buildEligibleWhere)(type, clinicId, branchId, now);
        const [eligible, listTotal] = await Promise.all([
            this.prisma.patientInsightScore.count({ where }),
            this.prisma.patientInsightScore.count({
                where: type === 'recall'
                    ? (0, patient_insights_filters_js_1.buildRecallListWhere)(clinicId, branchId, now)
                    : (0, patient_insights_filters_js_1.buildChurnListWhere)(clinicId, branchId, now),
            }),
        ]);
        return { type, eligible, list_total: listTotal, cooldown_days: patient_insights_filters_js_1.CAMPAIGN_COOLDOWN_DAYS };
    }
    async getPatientScore(clinicId, patientId) {
        const score = await this.prisma.patientInsightScore.findUnique({
            where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        });
        if (!score)
            throw new common_1.NotFoundException('No insight score found for this patient. Run a compute first.');
        return score;
    }
    async debugRecallVisibility(clinicId, branchId, patientId) {
        const now = new Date();
        const [listCount, recallDueCount, latestBatch] = await Promise.all([
            this.prisma.patientInsightScore.count({
                where: (0, patient_insights_filters_js_1.buildRecallListWhere)(clinicId, branchId, now),
            }),
            this.prisma.patientInsightScore.count({
                where: { clinic_id: clinicId, recall_due: true },
            }),
            this.getLatestBatch(clinicId),
        ]);
        const scores = await this.prisma.patientInsightScore.findMany({
            where: {
                clinic_id: clinicId,
                recall_due: true,
                ...(patientId ? { patient_id: patientId } : {}),
            },
            include: {
                patient: {
                    select: { id: true, first_name: true, last_name: true, branch_id: true },
                },
            },
            orderBy: { recall_due_days: 'desc' },
        });
        if (patientId && scores.length === 0) {
            const anyScore = await this.prisma.patientInsightScore.findUnique({
                where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
                include: { patient: { select: { first_name: true, last_name: true, branch_id: true } } },
            });
            return {
                branch_filter: branchId ?? null,
                summary_recall_count: listCount,
                recall_due_raw_count: recallDueCount,
                last_computed_at: latestBatch?.completed_at ?? null,
                message: anyScore
                    ? 'Patient has a score row but recall_due is false — check treatment status/date and run Recompute'
                    : 'No insight score row — click Recompute on AI Insights first',
                patient: anyScore
                    ? {
                        patient_id: patientId,
                        name: anyScore.patient
                            ? `${anyScore.patient.first_name} ${anyScore.patient.last_name}`
                            : null,
                        recall_due: anyScore.recall_due,
                        recall_due_days: anyScore.recall_due_days,
                        recall_status: anyScore.recall_status,
                        churn_risk: anyScore.churn_risk,
                        churn_factors: anyScore.churn_factors,
                        computed_at: anyScore.computed_at,
                        ...(0, patient_insights_filters_js_1.explainRecallExclusion)(anyScore, { branchId }, now),
                    }
                    : null,
                patients_with_recall_due: [],
            };
        }
        return {
            branch_filter: branchId ?? null,
            summary_recall_count: listCount,
            recall_due_raw_count: recallDueCount,
            last_computed_at: latestBatch?.completed_at ?? null,
            hint: listCount === 0 && recallDueCount > 0
                ? 'Patients have recall_due=true but are filtered out — see exclusion_reasons below'
                : listCount === 0 && recallDueCount === 0
                    ? 'No patients scored as recall_due — add completed treatment and run Recompute'
                    : null,
            patients_with_recall_due: scores.map((s) => ({
                patient_id: s.patient_id,
                name: s.patient ? `${s.patient.first_name} ${s.patient.last_name}` : null,
                recall_due_days: s.recall_due_days,
                recall_status: s.recall_status,
                churn_risk: s.churn_risk,
                churn_factors: s.churn_factors,
                score_branch_id: s.branch_id,
                patient_branch_id: s.patient?.branch_id ?? null,
                computed_at: s.computed_at,
                ...(0, patient_insights_filters_js_1.explainRecallExclusion)(s, { branchId }, now),
            })),
        };
    }
    async getBatchStatus(batchId, clinicId) {
        const batch = await this.prisma.insightComputationBatch.findFirst({
            where: { id: batchId, clinic_id: clinicId },
            select: { id: true, status: true, patient_count: true, started_at: true, completed_at: true, error_message: true },
        });
        if (!batch)
            throw new common_1.NotFoundException('Batch not found');
        return batch;
    }
    async getLatestBatch(clinicId) {
        return this.prisma.insightComputationBatch.findFirst({
            where: { clinic_id: clinicId },
            orderBy: { started_at: 'desc' },
            select: { id: true, status: true, patient_count: true, started_at: true, completed_at: true },
        });
    }
    async getClinicAvgVisitValue(clinicId, branchId) {
        const clinicAvgResult = await this.prisma.invoice.aggregate({
            where: (0, patient_insights_opportunity_js_1.buildRevenueInvoiceWhere)(clinicId, branchId),
            _avg: { net_amount: true },
        });
        return Math.round((0, patient_insights_opportunity_js_1.resolveClinicAvgVisitValue)(Number(clinicAvgResult._avg.net_amount ?? 0)));
    }
    async countUniqueAtRiskPatients(clinicId, branchId, now = new Date()) {
        const [noShowRows, recallRows, churnRows] = await Promise.all([
            this.prisma.patientInsightScore.findMany({
                where: (0, patient_insights_filters_js_1.buildNoShowListWhere)(clinicId, branchId),
                select: { patient_id: true },
            }),
            this.prisma.patientInsightScore.findMany({
                where: (0, patient_insights_filters_js_1.buildRecallListWhere)(clinicId, branchId, now),
                select: { patient_id: true },
            }),
            this.prisma.patientInsightScore.findMany({
                where: (0, patient_insights_filters_js_1.buildChurnListWhere)(clinicId, branchId, now),
                select: { patient_id: true },
            }),
        ]);
        return (0, patient_insights_opportunity_js_1.dedupeAtRiskBuckets)(noShowRows, recallRows, churnRows).totalUniquePatients;
    }
    async getOpportunitySummary(clinicId, branchId) {
        const now = new Date();
        const clinicDefault = await this.getClinicAvgVisitValue(clinicId, branchId);
        const scoreSelect = (0, patient_insights_opportunity_js_1.buildAtRiskScoreSelect)(branchId);
        const [recallRows, noShowRows, churnRows] = await Promise.all([
            this.prisma.patientInsightScore.findMany({
                where: (0, patient_insights_filters_js_1.buildRecallListWhere)(clinicId, branchId, now),
                select: scoreSelect,
            }),
            this.prisma.patientInsightScore.findMany({
                where: (0, patient_insights_filters_js_1.buildNoShowListWhere)(clinicId, branchId),
                select: { ...scoreSelect, no_show_risk: true },
            }),
            this.prisma.patientInsightScore.findMany({
                where: (0, patient_insights_filters_js_1.buildChurnListWhere)(clinicId, branchId, now),
                select: scoreSelect,
            }),
        ]);
        const buckets = (0, patient_insights_opportunity_js_1.dedupeAtRiskBuckets)(noShowRows, recallRows, churnRows);
        const values = (0, patient_insights_opportunity_js_1.computeOpportunityValues)(buckets, clinicDefault);
        return {
            ...values,
            clinic_avg_visit_value: clinicDefault,
        };
    }
    async getRecoveredSummary(clinicId, branchId) {
        const now = new Date();
        const PERIOD_DAYS = 90;
        const windowStart = new Date(now.getTime() - PERIOD_DAYS * patient_insights_filters_js_1.MS_PER_DAY);
        const clinicDefault = await this.getClinicAvgVisitValue(clinicId, branchId);
        const invoiceFilter = (0, patient_insights_opportunity_js_1.buildRevenueInvoiceWhere)(clinicId, branchId);
        const invoiceSelect = { net_amount: true, created_at: true };
        const baseWhere = (0, patient_insights_filters_js_1.buildInsightBaseWhere)(clinicId, branchId);
        const patientWithInvoices = {
            select: {
                invoices: {
                    where: invoiceFilter,
                    orderBy: { created_at: 'asc' },
                    take: 20,
                    select: invoiceSelect,
                },
            },
        };
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
        const recalledIds = new Set(recallRows.map((r) => r.patient_id));
        const inactiveIds = new Set(churnRows.map((r) => r.patient_id));
        const noShowUnique = noShowRows.filter((r) => !recalledIds.has(r.patient_id) && !inactiveIds.has(r.patient_id));
        const computeBucket = (rows, stampDateFn) => {
            let recovered = 0;
            let expected = 0;
            for (const row of rows) {
                const allInvoices = row.patient?.invoices ?? [];
                const stampMs = new Date(stampDateFn(row)).setHours(0, 0, 0, 0);
                const afterStamp = allInvoices.filter((i) => new Date(i.created_at).setHours(0, 0, 0, 0) >= stampMs);
                const beforeStamp = allInvoices.filter((i) => new Date(i.created_at).setHours(0, 0, 0, 0) < stampMs);
                const patientRecovered = afterStamp.reduce((s, i) => s + Number(i.net_amount), 0);
                recovered += Math.min(patientRecovered, patient_insights_opportunity_js_1.MAX_VISIT_VALUE_PER_PATIENT);
                expected += (0, patient_insights_opportunity_js_1.patientAvgFromInvoices)(beforeStamp, clinicDefault);
            }
            return { count: rows.length, recovered: Math.round(recovered), expected: Math.round(expected) };
        };
        const recallBucket = computeBucket(recallRows, (r) => r.recall_booked_after_outreach_at);
        const inactiveBucket = computeBucket(churnRows, (r) => r.churn_booked_after_outreach_at);
        const noShowBucket = computeBucket(noShowUnique, (r) => r.no_show_attended_at);
        const totalRecovered = recallBucket.recovered + inactiveBucket.recovered + noShowBucket.recovered;
        const totalExpected = recallBucket.expected + inactiveBucket.expected + noShowBucket.expected;
        const totalPatients = recallBucket.count + inactiveBucket.count + noShowBucket.count;
        return {
            recall: recallBucket,
            inactive: inactiveBucket,
            no_show: noShowBucket,
            total_patients_returned: totalPatients,
            total_recovered: totalRecovered,
            total_expected: totalExpected,
            exceeded: totalPatients > 0 && totalRecovered > totalExpected,
            period_days: PERIOD_DAYS,
        };
    }
    async recordAction(clinicId, patientId, dto, userId) {
        const score = await this.prisma.patientInsightScore.findUnique({
            where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        });
        if (!score)
            throw new common_1.NotFoundException('No insight score found for this patient.');
        const recallActions = ['contacted', 'snooze', 'move_inactive'];
        const churnActions = ['contacted', 'snooze', 'decline'];
        if (dto.type === 'recall' && !recallActions.includes(dto.action)) {
            throw new common_1.BadRequestException(`Action "${dto.action}" is not valid for Due for a Check-up insights.`);
        }
        if (dto.type === 'churn' && !churnActions.includes(dto.action)) {
            throw new common_1.BadRequestException(`Action "${dto.action}" is not valid for Inactive Patient insights.`);
        }
        const now = new Date();
        const update = {};
        if (dto.type === 'recall') {
            if (dto.action === 'contacted') {
                update.recall_status = 'contacted';
                update.recall_last_contacted_at = now;
            }
            else if (dto.action === 'snooze') {
                const days = Math.min(dto.snooze_days ?? 7, 30);
                const windowEnd = score.recall_window_start
                    ? new Date(score.recall_window_start.getTime() + patient_insights_filters_js_1.INSIGHT_WINDOW_DAYS * patient_insights_filters_js_1.MS_PER_DAY)
                    : new Date(now.getTime() + days * patient_insights_filters_js_1.MS_PER_DAY);
                const snoozeUntil = new Date(Math.min(now.getTime() + days * patient_insights_filters_js_1.MS_PER_DAY, windowEnd.getTime()));
                update.recall_status = 'snoozed';
                update.recall_snoozed_until = snoozeUntil;
            }
            else if (dto.action === 'move_inactive') {
                update.recall_status = 'moved_inactive';
                if (!score.churn_window_start) {
                    update.churn_window_start = now;
                    update.churn_status = null;
                }
            }
        }
        else if (dto.action === 'contacted') {
            update.churn_status = 'contacted';
            update.churn_last_contacted_at = now;
        }
        else if (dto.action === 'snooze') {
            const days = Math.min(dto.snooze_days ?? 7, 30);
            const windowEnd = score.churn_window_start
                ? new Date(score.churn_window_start.getTime() + patient_insights_filters_js_1.INSIGHT_WINDOW_DAYS * patient_insights_filters_js_1.MS_PER_DAY)
                : new Date(now.getTime() + days * patient_insights_filters_js_1.MS_PER_DAY);
            const snoozeUntil = new Date(Math.min(now.getTime() + days * patient_insights_filters_js_1.MS_PER_DAY, windowEnd.getTime()));
            update.churn_status = 'snoozed';
            update.churn_snoozed_until = snoozeUntil;
        }
        else if (dto.action === 'decline') {
            update.churn_status = 'declined';
            update.churn_retry_after = new Date(now.getTime() + 365 * patient_insights_filters_js_1.MS_PER_DAY);
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
            .catch((err) => this.logger.warn(`Insight action audit failed: ${err.message}`));
        return updated;
    }
};
exports.PatientInsightsService = PatientInsightsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PatientInsightsService.prototype, "computeAllClinics", null);
exports.PatientInsightsService = PatientInsightsService = PatientInsightsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        audit_log_service_js_1.AuditLogService])
], PatientInsightsService);
//# sourceMappingURL=patient-insights.service.js.map