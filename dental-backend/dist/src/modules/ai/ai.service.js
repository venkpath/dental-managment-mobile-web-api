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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const prisma_service_js_1 = require("../../database/prisma.service.js");
const currency_util_js_1 = require("../../common/utils/currency.util.js");
const ai_usage_service_js_1 = require("./ai-usage.service.js");
const clinical_notes_prompt_js_1 = require("./prompts/clinical-notes.prompt.js");
const prescription_prompt_js_1 = require("./prompts/prescription.prompt.js");
const treatment_plan_prompt_js_1 = require("./prompts/treatment-plan.prompt.js");
const revenue_insights_prompt_js_1 = require("./prompts/revenue-insights.prompt.js");
const dental_chart_analysis_prompt_js_1 = require("./prompts/dental-chart-analysis.prompt.js");
const appointment_summary_prompt_js_1 = require("./prompts/appointment-summary.prompt.js");
const campaign_content_prompt_js_1 = require("./prompts/campaign-content.prompt.js");
const xray_analysis_prompt_js_1 = require("./prompts/xray-analysis.prompt.js");
const review_reply_prompt_js_1 = require("./prompts/review-reply.prompt.js");
let AiService = AiService_1 = class AiService {
    prisma;
    config;
    aiUsage;
    logger = new common_1.Logger(AiService_1.name);
    openai;
    model;
    constructor(prisma, config, aiUsage) {
        this.prisma = prisma;
        this.config = config;
        this.aiUsage = aiUsage;
        this.openai = new openai_1.default({
            apiKey: this.config.get('OPENAI_API_KEY'),
        });
        this.model = this.config.get('OPENAI_MODEL') || 'gpt-4o-mini';
    }
    async getClinicCurrencySymbol(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { currency_code: true },
        });
        return (0, currency_util_js_1.getCurrencySymbol)(clinic?.currency_code ?? 'INR');
    }
    async saveInsight(params) {
        try {
            return await this.prisma.aiInsight.create({
                data: {
                    clinic_id: params.clinicId,
                    type: params.type,
                    title: params.title,
                    data: params.data,
                    context: params.context ?? undefined,
                    generated_by: params.userId ?? undefined,
                },
            });
        }
        catch (err) {
            this.logger.warn('Failed to save AI insight', err.message);
            return null;
        }
    }
    async listInsights(clinicId, params) {
        const where = { clinic_id: clinicId };
        if (params.type)
            where.type = params.type;
        const [items, total] = await Promise.all([
            this.prisma.aiInsight.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: params.limit || 20,
                skip: params.offset || 0,
            }),
            this.prisma.aiInsight.count({ where }),
        ]);
        return { items, total };
    }
    async getInsight(clinicId, insightId) {
        const insight = await this.prisma.aiInsight.findUnique({
            where: { id: insightId },
        });
        if (!insight || insight.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('AI insight not found');
        }
        return insight;
    }
    async getUsageStats(clinicId) {
        const snapshot = await this.aiUsage.snapshot(clinicId);
        const [byType, byUser, costAgg, pendingCharge] = await Promise.all([
            this.prisma.aiUsageRecord.groupBy({
                by: ['type'],
                where: {
                    clinic_id: clinicId,
                    cycle_start: snapshot.cycle_start,
                },
                _count: true,
                orderBy: { _count: { type: 'desc' } },
            }),
            this.prisma.aiUsageRecord.groupBy({
                by: ['user_id'],
                where: {
                    clinic_id: clinicId,
                    cycle_start: snapshot.cycle_start,
                    user_id: { not: null },
                },
                _count: true,
                orderBy: { _count: { user_id: 'desc' } },
            }),
            this.prisma.aiUsageRecord.aggregate({
                where: {
                    clinic_id: clinicId,
                    cycle_start: snapshot.cycle_start,
                    is_overage: true,
                },
                _sum: { cost_inr: true },
                _count: true,
            }),
            snapshot.pending_charge_id
                ? this.prisma.aiOverageCharge.findUnique({
                    where: { id: snapshot.pending_charge_id },
                })
                : Promise.resolve(null),
        ]);
        const userIds = byUser.map((u) => u.user_id).filter(Boolean);
        const users = userIds.length
            ? await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, role: true },
            })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u]));
        const usedBase = Math.min(snapshot.used_in_cycle, snapshot.base_quota);
        const usedOverage = Math.max(0, snapshot.used_in_cycle - snapshot.base_quota);
        return {
            base_quota: snapshot.base_quota,
            overage_cap: snapshot.overage_cap,
            overage_enabled: snapshot.overage_enabled,
            approved_extra: snapshot.approved_extra,
            used: snapshot.used_in_cycle,
            used_base: usedBase,
            used_overage: usedOverage,
            effective_quota: snapshot.effective_quota,
            remaining: Math.max(0, snapshot.effective_quota - snapshot.used_in_cycle),
            cycle_start: snapshot.cycle_start,
            cycle_end: snapshot.cycle_end,
            is_blocked_unpaid: snapshot.is_blocked_unpaid,
            pending_charge: pendingCharge,
            plan_name: snapshot.plan_name,
            current_cycle_overage_cost_inr: Number(costAgg._sum?.cost_inr ?? 0),
            current_cycle_overage_count: costAgg._count,
            by_type: byType.map((t) => ({ type: t.type, count: t._count })),
            by_user: byUser.map((u) => ({
                user_id: u.user_id,
                name: userMap.get(u.user_id)?.name ?? 'Unknown',
                role: userMap.get(u.user_id)?.role ?? '',
                count: u._count,
            })),
        };
    }
    async deleteInsight(clinicId, insightId) {
        const insight = await this.prisma.aiInsight.findUnique({
            where: { id: insightId },
        });
        if (!insight || insight.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('AI insight not found');
        }
        await this.prisma.aiInsight.delete({ where: { id: insightId } });
        return { deleted: true };
    }
    async callVisionLLM(systemPrompt, userPrompt, imageBase64, mimeType, meta) {
        const model = 'gpt-4o';
        try {
            const response = await this.openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: userPrompt },
                            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
                        ],
                    },
                ],
                temperature: 0.1,
                max_tokens: 8000,
                response_format: { type: 'json_object' },
            });
            const content = response.choices[0]?.message?.content;
            if (!content)
                throw new common_1.BadRequestException('AI returned empty response');
            await this.aiUsage.recordUsage({
                clinicId: meta.clinicId,
                userId: meta.userId,
                type: meta.type,
                model,
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
            }).catch((e) => this.logger.warn(`recordUsage failed: ${e.message}`));
            return JSON.parse(content);
        }
        catch (error) {
            await this.aiUsage.releaseReservation(meta.clinicId).catch(() => undefined);
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('Vision LLM call failed', error.stack);
            throw new common_1.BadRequestException('AI X-ray analysis temporarily unavailable. Please try again.');
        }
    }
    async callLLM(systemPrompt, userPrompt, meta) {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.3,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new common_1.BadRequestException('AI returned empty response');
            }
            await this.aiUsage.recordUsage({
                clinicId: meta.clinicId,
                userId: meta.userId,
                type: meta.type,
                model: this.model,
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
            }).catch((e) => this.logger.warn(`recordUsage failed: ${e.message}`));
            return JSON.parse(content);
        }
        catch (error) {
            await this.aiUsage.releaseReservation(meta.clinicId).catch(() => undefined);
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('LLM call failed', error.stack);
            throw new common_1.BadRequestException('AI service temporarily unavailable. Please try again.');
        }
    }
    async getPatientContext(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({
            where: { id: patientId },
            include: {
                tooth_conditions: {
                    include: { tooth: true },
                },
            },
        });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
        }
        const age = patient.date_of_birth
            ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : patient.age ?? null;
        const toothChart = patient.tooth_conditions.map((tc) => ({
            tooth: tc.tooth.fdi_number?.toString() || tc.tooth.name,
            condition: tc.condition,
            severity: tc.severity ?? undefined,
            notes: tc.notes ?? undefined,
        }));
        return { patient, age, toothChart };
    }
    async generateClinicalNotes(clinicId, dto, userId) {
        const { patient, age, toothChart } = await this.getPatientContext(clinicId, dto.patient_id);
        const userPrompt = (0, clinical_notes_prompt_js_1.buildClinicalNotesUserPrompt)({
            dentist_notes: dto.dentist_notes,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            patient_age: age,
            patient_gender: patient.gender,
            chief_complaint: dto.chief_complaint,
            allergies: patient.allergies ?? undefined,
            existing_conditions: patient.medical_history
                ? Object.entries(patient.medical_history)
                    .filter(([, v]) => v === true)
                    .map(([k]) => k)
                : undefined,
            tooth_chart: toothChart,
        });
        this.logger.log(`Generating clinical notes for patient ${dto.patient_id}`);
        const result = await this.callLLM(clinical_notes_prompt_js_1.CLINICAL_NOTES_SYSTEM_PROMPT, userPrompt, {
            clinicId,
            userId,
            type: 'clinical_notes',
        });
        const response = {
            ...result,
            patient_id: dto.patient_id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            generated_at: new Date().toISOString(),
        };
        const saved = await this.saveInsight({
            clinicId,
            type: 'clinical_notes',
            title: `Clinical Notes: ${patient.first_name} ${patient.last_name}`,
            data: response,
            context: { patient_id: dto.patient_id, chief_complaint: dto.chief_complaint },
            userId,
        });
        return { ...response, insight_id: saved?.id };
    }
    async generatePrescription(clinicId, dto, userId) {
        const { patient, age } = await this.getPatientContext(clinicId, dto.patient_id);
        const mergedAllergies = [patient.allergies, dto.allergies_medical_history]
            .filter((s) => !!s && s.trim().length > 0)
            .join(' | ') || undefined;
        const userPrompt = (0, prescription_prompt_js_1.buildPrescriptionUserPrompt)({
            diagnosis: dto.diagnosis,
            chief_complaint: dto.chief_complaint,
            past_dental_history: dto.past_dental_history,
            procedures_performed: dto.procedures_performed,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            patient_age: age,
            patient_gender: patient.gender,
            allergies: mergedAllergies,
            medical_history: patient.medical_history ?? undefined,
            existing_medications: dto.existing_medications,
            tooth_numbers: dto.tooth_numbers,
        });
        this.logger.log(`Generating prescription for patient ${dto.patient_id}`);
        const result = await this.callLLM(prescription_prompt_js_1.PRESCRIPTION_SYSTEM_PROMPT, userPrompt, {
            clinicId,
            userId,
            type: 'prescription',
        });
        const response = {
            ...result,
            patient_id: dto.patient_id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            generated_at: new Date().toISOString(),
        };
        const saved = await this.saveInsight({
            clinicId,
            type: 'prescription',
            title: `Prescription: ${patient.first_name} ${patient.last_name}`,
            data: response,
            context: { patient_id: dto.patient_id, diagnosis: dto.diagnosis },
            userId,
        });
        return { ...response, insight_id: saved?.id };
    }
    async generateTreatmentPlan(clinicId, dto, userId) {
        const { patient, age, toothChart } = await this.getPatientContext(clinicId, dto.patient_id);
        const treatments = await this.prisma.treatment.findMany({
            where: { patient_id: dto.patient_id, clinic_id: clinicId },
            orderBy: { created_at: 'desc' },
            take: 20,
            select: {
                procedure: true,
                tooth_number: true,
                created_at: true,
                status: true,
            },
        });
        const catalog = await this.prisma.treatment.groupBy({
            by: ['procedure'],
            where: { clinic_id: clinicId },
            _avg: { cost: true },
        });
        const treatmentCatalog = catalog
            .filter((c) => c._avg?.cost !== null)
            .map((c) => ({
            name: c.procedure,
            price: Math.round(Number(c._avg?.cost ?? 0)),
        }));
        const userPrompt = (0, treatment_plan_prompt_js_1.buildTreatmentPlanUserPrompt)({
            patient_name: `${patient.first_name} ${patient.last_name}`,
            patient_age: age,
            patient_gender: patient.gender,
            medical_history: patient.medical_history ?? undefined,
            allergies: patient.allergies ?? undefined,
            chief_complaint: dto.chief_complaint,
            tooth_chart: toothChart,
            existing_treatments: treatments.map((t) => ({
                procedure: t.procedure,
                tooth: t.tooth_number ?? undefined,
                date: t.created_at.toISOString().split('T')[0],
                status: t.status,
            })),
            treatment_catalog: treatmentCatalog,
            currency_symbol: await this.getClinicCurrencySymbol(clinicId),
        });
        this.logger.log(`Generating treatment plan for patient ${dto.patient_id}`);
        const result = await this.callLLM(treatment_plan_prompt_js_1.TREATMENT_PLAN_SYSTEM_PROMPT, userPrompt, {
            clinicId,
            userId,
            type: 'treatment_plan',
        });
        const response = {
            ...result,
            patient_id: dto.patient_id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            generated_at: new Date().toISOString(),
        };
        const saved = await this.saveInsight({
            clinicId,
            type: 'treatment_plan',
            title: `Treatment Plan: ${patient.first_name} ${patient.last_name}`,
            data: response,
            context: { patient_id: dto.patient_id, chief_complaint: dto.chief_complaint },
            userId,
        });
        return { ...response, insight_id: saved?.id };
    }
    async generateRevenueInsights(clinicId, dto, userId) {
        const dateFilter = {
            gte: new Date(dto.start_date),
            lte: new Date(dto.end_date),
        };
        const branchFilter = dto.branch_id ? { branch_id: dto.branch_id } : {};
        const [invoices, appointments, patients, treatments, dentists, inventoryAlerts] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: { clinic_id: clinicId, ...branchFilter, created_at: dateFilter },
                _sum: { total_amount: true, net_amount: true, discount_amount: true, tax_amount: true },
                _count: true,
            }),
            this.prisma.appointment.groupBy({
                by: ['status'],
                where: { clinic_id: clinicId, ...branchFilter, appointment_date: dateFilter },
                _count: true,
            }),
            this.prisma.patient.aggregate({
                where: { clinic_id: clinicId, ...branchFilter, created_at: dateFilter },
                _count: true,
            }),
            this.prisma.treatment.groupBy({
                by: ['procedure'],
                where: { clinic_id: clinicId, ...branchFilter, created_at: dateFilter },
                _count: true,
                orderBy: { _count: { procedure: 'desc' } },
                take: 10,
            }),
            this.prisma.user.findMany({
                where: { clinic_id: clinicId, role: { in: ['Dentist', 'Consultant'] } },
                select: {
                    name: true,
                    appointments: {
                        where: { appointment_date: dateFilter, ...branchFilter },
                        select: { id: true },
                    },
                    treatments: {
                        where: { created_at: dateFilter, ...branchFilter },
                        select: { cost: true },
                    },
                },
            }),
            this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint as count FROM inventory_items WHERE clinic_id = $1 AND quantity <= reorder_level`, clinicId).then((r) => Number(r[0]?.count ?? 0)).catch(() => 0),
        ]);
        const apptByStatus = Object.fromEntries(appointments.map((a) => [a.status, a._count]));
        const totalAppts = appointments.reduce((sum, a) => sum + a._count, 0);
        const totalRevenue = Number(invoices._sum?.total_amount ?? 0);
        const netAmount = Number(invoices._sum?.net_amount ?? 0);
        const userPrompt = (0, revenue_insights_prompt_js_1.buildRevenueInsightsUserPrompt)({
            revenue: {
                total_revenue: totalRevenue,
                paid_invoices: netAmount,
                pending_invoices: totalRevenue - netAmount,
                outstanding_amount: totalRevenue - netAmount,
                tax_collected: Number(invoices._sum?.tax_amount ?? 0),
                discounts: Number(invoices._sum?.discount_amount ?? 0),
            },
            appointments: {
                total_appointments: totalAppts,
                completed: apptByStatus['completed'] ?? 0,
                cancelled: apptByStatus['cancelled'] ?? 0,
                no_show: apptByStatus['no_show'] ?? 0,
            },
            patients: {
                total_patients: patients._count,
                new_patients: patients._count,
                returning_patients: 0,
            },
            treatments: {
                most_common_procedures: treatments.map((t) => ({
                    procedure: t.procedure,
                    count: t._count,
                })),
            },
            dentists: dentists.map((d) => ({
                name: d.name,
                appointments_handled: d.appointments.length,
                treatments_performed: d.treatments.length,
                revenue_generated: d.treatments.reduce((sum, t) => sum + Number(t.cost), 0),
            })),
            inventory_alerts: inventoryAlerts,
            date_range: `${dto.start_date} to ${dto.end_date}`,
            currency_symbol: await this.getClinicCurrencySymbol(clinicId),
        });
        this.logger.log(`Generating revenue insights for clinic ${clinicId}`);
        const result = await this.callLLM(revenue_insights_prompt_js_1.REVENUE_INSIGHTS_SYSTEM_PROMPT, userPrompt, {
            clinicId,
            userId,
            type: 'revenue_insights',
        });
        const response = {
            ...result,
            generated_at: new Date().toISOString(),
        };
        const saved = await this.saveInsight({
            clinicId,
            type: 'revenue_insights',
            title: `Revenue Insights: ${dto.start_date} to ${dto.end_date}`,
            data: response,
            context: { start_date: dto.start_date, end_date: dto.end_date, branch_id: dto.branch_id },
            userId,
        });
        return { ...response, insight_id: saved?.id };
    }
    async generateChartAnalysis(clinicId, dto, userId) {
        const { patient, age } = await this.getPatientContext(clinicId, dto.patient_id);
        const conditions = await this.prisma.patientToothCondition.findMany({
            where: { patient_id: dto.patient_id, clinic_id: clinicId },
            include: { tooth: true },
        });
        const totalTeeth = await this.prisma.tooth.count();
        const userPrompt = (0, dental_chart_analysis_prompt_js_1.buildDentalChartAnalysisUserPrompt)({
            patient_name: `${patient.first_name} ${patient.last_name}`,
            patient_age: age,
            patient_gender: patient.gender,
            medical_history: patient.medical_history ?? undefined,
            allergies: patient.allergies ?? undefined,
            tooth_conditions: conditions.map((c) => ({
                tooth: c.tooth.name,
                fdi_number: c.tooth.fdi_number,
                condition: c.condition,
                severity: c.severity ?? undefined,
                notes: c.notes ?? undefined,
            })),
            total_teeth: totalTeeth,
        });
        this.logger.log(`Generating chart analysis for patient ${dto.patient_id}`);
        const result = await this.callLLM(dental_chart_analysis_prompt_js_1.DENTAL_CHART_ANALYSIS_SYSTEM_PROMPT, userPrompt, {
            clinicId,
            userId,
            type: 'chart_analysis',
        });
        const response = {
            ...result,
            patient_id: dto.patient_id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            generated_at: new Date().toISOString(),
        };
        const saved = await this.saveInsight({
            clinicId,
            type: 'chart_analysis',
            title: `Chart Analysis: ${patient.first_name} ${patient.last_name}`,
            data: response,
            context: { patient_id: dto.patient_id },
            userId,
        });
        return { ...response, insight_id: saved?.id };
    }
    async generateAppointmentSummary(clinicId, dto, userId) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: dto.appointment_id },
            include: {
                patient: true,
                dentist: true,
            },
        });
        if (!appointment || appointment.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Appointment not found`);
        }
        const apptDate = appointment.appointment_date.toISOString().split('T')[0];
        const treatments = await this.prisma.treatment.findMany({
            where: {
                patient_id: appointment.patient_id,
                clinic_id: clinicId,
                created_at: {
                    gte: new Date(new Date(apptDate).setHours(0, 0, 0)),
                    lte: new Date(new Date(apptDate).setHours(23, 59, 59)),
                },
            },
            select: { procedure: true, tooth_number: true, status: true, notes: true },
        });
        const prescriptions = await this.prisma.prescription.findMany({
            where: {
                patient_id: appointment.patient_id,
                clinic_id: clinicId,
                created_at: {
                    gte: new Date(new Date(apptDate).setHours(0, 0, 0)),
                    lte: new Date(new Date(apptDate).setHours(23, 59, 59)),
                },
            },
            include: { items: true },
        });
        const age = appointment.patient.date_of_birth
            ? Math.floor((Date.now() - new Date(appointment.patient.date_of_birth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000))
            : appointment.patient.age ?? null;
        const userPrompt = (0, appointment_summary_prompt_js_1.buildAppointmentSummaryUserPrompt)({
            patient_name: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
            patient_age: age,
            dentist_name: appointment.dentist.name,
            appointment_date: apptDate,
            appointment_time: appointment.start_time,
            appointment_notes: appointment.notes ?? undefined,
            chief_complaint: dto.chief_complaint,
            treatments_during_visit: treatments.map((t) => ({
                procedure: t.procedure,
                tooth_number: t.tooth_number ?? undefined,
                status: t.status,
                notes: t.notes ?? undefined,
            })),
            prescriptions_during_visit: prescriptions.map((p) => ({
                diagnosis: p.diagnosis ?? undefined,
                items: p.items.map((item) => ({
                    medicine_name: item.medicine_name,
                    dosage: item.dosage,
                })),
            })),
        });
        this.logger.log(`Generating appointment summary for ${dto.appointment_id}`);
        const result = await this.callLLM(appointment_summary_prompt_js_1.APPOINTMENT_SUMMARY_SYSTEM_PROMPT, userPrompt, {
            clinicId,
            userId,
            type: 'appointment_summary',
        });
        const response = {
            ...result,
            appointment_id: dto.appointment_id,
            patient_name: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
            dentist_name: appointment.dentist.name,
            generated_at: new Date().toISOString(),
        };
        const saved = await this.saveInsight({
            clinicId,
            type: 'appointment_summary',
            title: `Appointment Summary: ${appointment.patient.first_name} ${appointment.patient.last_name}`,
            data: response,
            context: { appointment_id: dto.appointment_id },
            userId,
        });
        return { ...response, insight_id: saved?.id };
    }
    async generateCampaignContent(clinicId, dto, userId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { name: true },
        });
        const userPrompt = (0, campaign_content_prompt_js_1.buildCampaignContentUserPrompt)({
            campaign_name: dto.campaign_name,
            campaign_type: dto.campaign_type,
            channel: dto.channel,
            target_audience: dto.target_audience,
            audience_size: dto.audience_size,
            clinic_name: clinic?.name,
            special_offer: dto.special_offer,
            additional_context: dto.additional_context,
        });
        this.logger.log(`Generating campaign content for clinic ${clinicId}`);
        const result = await this.callLLM(campaign_content_prompt_js_1.CAMPAIGN_CONTENT_SYSTEM_PROMPT, userPrompt, {
            clinicId,
            userId,
            type: 'campaign_content',
        });
        const response = {
            ...result,
            generated_at: new Date().toISOString(),
        };
        const saved = await this.saveInsight({
            clinicId,
            type: 'campaign_content',
            title: `Campaign: ${dto.campaign_name}`,
            data: response,
            context: { campaign_name: dto.campaign_name, campaign_type: dto.campaign_type, channel: dto.channel },
            userId,
        });
        return { ...response, insight_id: saved?.id };
    }
    async analyzeXray(clinicId, params) {
        const attachment = await this.prisma.attachment.findUnique({
            where: { id: params.attachmentId },
            include: { patient: true },
        });
        if (!attachment || attachment.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Attachment not found');
        }
        if (attachment.type !== 'xray') {
            throw new common_1.BadRequestException('Only X-ray attachments can be analyzed');
        }
        const { readFile } = await import('fs/promises');
        const { join } = await import('path');
        const filePath = join(process.cwd(), attachment.file_url);
        const fileBuffer = await readFile(filePath);
        const imageBase64 = fileBuffer.toString('base64');
        const patient = attachment.patient;
        const age = patient.date_of_birth
            ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : patient.age ?? null;
        const userPrompt = (0, xray_analysis_prompt_js_1.buildXrayAnalysisUserPrompt)({
            patient_name: `${patient.first_name} ${patient.last_name}`,
            patient_age: age,
            patient_gender: patient.gender,
            notes: params.notes,
        });
        this.logger.log(`Analyzing X-ray for patient ${patient.id}, attachment ${params.attachmentId}`);
        const result = await this.callVisionLLM(xray_analysis_prompt_js_1.XRAY_ANALYSIS_SYSTEM_PROMPT, userPrompt, imageBase64, attachment.mime_type || 'image/jpeg', { clinicId, userId: params.userId, type: 'xray_analysis' });
        const response = {
            ...result,
            attachment_id: params.attachmentId,
            patient_id: patient.id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            generated_at: new Date().toISOString(),
        };
        await this.prisma.attachment.update({
            where: { id: params.attachmentId },
            data: { ai_analysis: response },
        });
        const saved = await this.saveInsight({
            clinicId,
            type: 'xray_analysis',
            title: `X-ray Analysis: ${patient.first_name} ${patient.last_name}`,
            data: response,
            context: { attachment_id: params.attachmentId, patient_id: patient.id },
            userId: params.userId,
        });
        return { ...response, insight_id: saved?.id };
    }
    async generateReviewReply(clinicId, dto, userId) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { name: true, phone: true },
        });
        if (!clinic) {
            throw new common_1.NotFoundException('Clinic not found');
        }
        const userPrompt = (0, review_reply_prompt_js_1.buildReviewReplyUserPrompt)({
            clinic_name: clinic.name,
            clinic_phone: clinic.phone ?? undefined,
            reviewer_name: dto.reviewer_name,
            rating: dto.rating,
            review_text: dto.review_text,
            tone: dto.tone || 'warm',
            custom_instructions: dto.custom_instructions,
            signature: dto.signature,
        });
        this.logger.log(`Generating review reply for clinic ${clinicId} (rating=${dto.rating})`);
        const result = await this.callLLM(review_reply_prompt_js_1.REVIEW_REPLY_SYSTEM_PROMPT, userPrompt, {
            clinicId,
            userId,
            type: 'review_reply',
        });
        return {
            reply: String(result['reply'] ?? '').trim(),
            language: String(result['language'] ?? 'en'),
            sentiment: String(result['sentiment'] ?? 'neutral'),
            is_safe_to_auto_post: Boolean(result['is_safe_to_auto_post'] ?? false),
            review_summary: String(result['review_summary'] ?? ''),
        };
    }
    async generateConsentTemplate(clinicId, systemPrompt, userPrompt, userId) {
        const result = await this.callLLM(systemPrompt, userPrompt, {
            clinicId,
            userId,
            type: 'consent_form',
        });
        const title = String(result['title'] ?? '').trim();
        const body = (result['body'] && typeof result['body'] === 'object' ? result['body'] : null);
        if (!title || !body) {
            throw new common_1.BadRequestException('AI returned an invalid consent template');
        }
        return { title, body };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService,
        ai_usage_service_js_1.AiUsageService])
], AiService);
//# sourceMappingURL=ai.service.js.map