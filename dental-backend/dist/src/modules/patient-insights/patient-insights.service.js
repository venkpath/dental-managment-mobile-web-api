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
const clinic_timezone_util_js_1 = require("../../common/utils/clinic-timezone.util.js");
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
    logger = new common_1.Logger(PatientInsightsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
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
                select: {
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
                },
            });
            const now = new Date();
            const CHUNK = 50;
            for (let i = 0; i < patients.length; i += CHUNK) {
                await Promise.all(patients.slice(i, i + CHUNK).map((patient) => {
                    const score = this.scorePatient(patient, now);
                    return this.prisma.patientInsightScore.upsert({
                        where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patient.id } },
                        create: { clinic_id: clinicId, branch_id: patient.branch_id, patient_id: patient.id, batch_id: batch.id, ...score },
                        update: { branch_id: patient.branch_id, batch_id: batch.id, computed_at: now, ...score },
                    });
                }));
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
    scorePatient(patient, now) {
        const msPerDay = 86_400_000;
        const past = patient.appointments.filter((a) => new Date(a.appointment_date) < now);
        const future = patient.appointments.filter((a) => new Date(a.appointment_date) >= now && a.status !== 'cancelled');
        const noShowCount = past.filter((a) => a.status === 'no_show').length;
        const cancelCount = past.filter((a) => a.status === 'cancelled').length;
        const completedVisits = past.filter((a) => a.status === 'completed');
        const recentNoShow = past
            .filter((a) => a.status === 'no_show')
            .some((a) => (now.getTime() - new Date(a.appointment_date).getTime()) / msPerDay < 90);
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
            const dueDate = new Date(lastDate.getTime() + interval * msPerDay);
            const daysUntilDue = Math.round((dueDate.getTime() - now.getTime()) / msPerDay);
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
            ? Math.round((now.getTime() - lastVisitDate.getTime()) / msPerDay)
            : null;
        let churnScore = 0;
        if (lastVisitDate && future.length === 0) {
            if (daysSinceVisit > 365)
                churnScore += 70;
            else if (daysSinceVisit > 180)
                churnScore += 50;
            else if (daysSinceVisit > 90)
                churnScore += 30;
            if (patient.invoices.length === 0)
                churnScore += 10;
        }
        churnScore = Math.min(churnScore, 100);
        let conversionScore = 0;
        let conversionInterest = null;
        let conversionValue = 0;
        if (patient.treatment_plans.length > 0) {
            const plan = patient.treatment_plans[0];
            const ageDays = Math.round((now.getTime() - new Date(plan.created_at).getTime()) / msPerDay);
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
        const where = branchId
            ? { clinic_id: clinicId, branch_id: branchId }
            : { clinic_id: clinicId };
        const [noShowHigh, noShowMed, recallDue, churnHigh, churnMed, conversion, aggregated, lastBatch] = await Promise.all([
            this.prisma.patientInsightScore.count({ where: { ...where, no_show_risk: 'high' } }),
            this.prisma.patientInsightScore.count({ where: { ...where, no_show_risk: 'medium' } }),
            this.prisma.patientInsightScore.count({ where: { ...where, recall_due: true } }),
            this.prisma.patientInsightScore.count({ where: { ...where, churn_risk: 'high' } }),
            this.prisma.patientInsightScore.count({ where: { ...where, churn_risk: 'medium' } }),
            this.prisma.patientInsightScore.count({ where: { ...where, conversion_score: { gte: 40 } } }),
            this.prisma.patientInsightScore.aggregate({
                where,
                _sum: { conversion_value: true },
                _avg: { confidence_score: true },
            }),
            this.prisma.insightComputationBatch.findFirst({
                where: { clinic_id: clinicId, status: 'completed' },
                orderBy: { completed_at: 'desc' },
                select: { completed_at: true, patient_count: true },
            }),
        ]);
        const potentialRevenue = Number(aggregated._sum.conversion_value ?? 0);
        const avgConfidence = Math.round(aggregated._avg.confidence_score ?? 0);
        return {
            no_show: { high: noShowHigh, medium: noShowMed, total: noShowHigh + noShowMed },
            recall: { total: recallDue },
            churn: { high: churnHigh, medium: churnMed, total: churnHigh + churnMed },
            conversion: { total: conversion, potential_revenue: potentialRevenue },
            total_at_risk: noShowHigh + noShowMed + churnHigh + churnMed + recallDue,
            confidence_score: avgConfidence,
            last_computed_at: lastBatch?.completed_at ?? null,
        };
    }
    async getList(clinicId, dto) {
        const { branch_id, type, limit = 10, offset = 0 } = dto;
        const base = branch_id ? { clinic_id: clinicId, branch_id } : { clinic_id: clinicId };
        const whereByType = {
            no_show: { ...base, no_show_risk: { in: ['high', 'medium'] } },
            recall: { ...base, recall_due: true },
            churn: { ...base, churn_risk: { in: ['high', 'medium'] } },
            conversion: { ...base, conversion_score: { gte: 40 } },
        };
        const orderByType = {
            no_show: { no_show_score: 'desc' },
            recall: { recall_due_days: 'desc' },
            churn: { churn_score: 'desc' },
            conversion: { conversion_score: 'desc' },
        };
        const effectiveType = type ?? 'no_show';
        const where = whereByType[effectiveType];
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
    async getPatientScore(clinicId, patientId) {
        const score = await this.prisma.patientInsightScore.findUnique({
            where: { clinic_id_patient_id: { clinic_id: clinicId, patient_id: patientId } },
        });
        if (!score)
            throw new common_1.NotFoundException('No insight score found for this patient. Run a compute first.');
        return score;
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
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], PatientInsightsService);
//# sourceMappingURL=patient-insights.service.js.map