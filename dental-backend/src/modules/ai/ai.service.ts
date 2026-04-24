import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../database/prisma.service.js';
import { getCurrencySymbol } from '../../common/utils/currency.util.js';
import {
  GenerateClinicalNotesDto,
  GeneratePrescriptionDto,
  GenerateTreatmentPlanDto,
  GenerateRevenueInsightsDto,
  GenerateChartAnalysisDto,
  GenerateAppointmentSummaryDto,
  GenerateCampaignContentDto,
} from './dto/index.js';
import {
  CLINICAL_NOTES_SYSTEM_PROMPT,
  buildClinicalNotesUserPrompt,
} from './prompts/clinical-notes.prompt.js';
import {
  PRESCRIPTION_SYSTEM_PROMPT,
  buildPrescriptionUserPrompt,
} from './prompts/prescription.prompt.js';
import {
  TREATMENT_PLAN_SYSTEM_PROMPT,
  buildTreatmentPlanUserPrompt,
} from './prompts/treatment-plan.prompt.js';
import {
  REVENUE_INSIGHTS_SYSTEM_PROMPT,
  buildRevenueInsightsUserPrompt,
} from './prompts/revenue-insights.prompt.js';
import {
  DENTAL_CHART_ANALYSIS_SYSTEM_PROMPT,
  buildDentalChartAnalysisUserPrompt,
} from './prompts/dental-chart-analysis.prompt.js';
import {
  APPOINTMENT_SUMMARY_SYSTEM_PROMPT,
  buildAppointmentSummaryUserPrompt,
} from './prompts/appointment-summary.prompt.js';
import {
  CAMPAIGN_CONTENT_SYSTEM_PROMPT,
  buildCampaignContentUserPrompt,
} from './prompts/campaign-content.prompt.js';
import {
  XRAY_ANALYSIS_SYSTEM_PROMPT,
  buildXrayAnalysisUserPrompt,
} from './prompts/xray-analysis.prompt.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
    this.model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
  }

  // ─── Helper: get clinic currency symbol ────────────────────────
  private async getClinicCurrencySymbol(clinicId: string): Promise<string> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: { currency_code: true } as any,
    }) as { currency_code?: string } | null;
    return getCurrencySymbol(clinic?.currency_code ?? 'INR');
  }

  // ─── Save AI result to database ────────────────────────────────
  private async saveInsight(params: {
    clinicId: string;
    type: string;
    title: string;
    data: Record<string, unknown>;
    context?: Record<string, unknown>;
    userId?: string;
  }) {
    try {
      return await this.prisma.aiInsight.create({
        data: {
          clinic_id: params.clinicId,
          type: params.type,
          title: params.title,
          data: params.data as never,
          context: params.context as never ?? undefined,
          generated_by: params.userId ?? undefined,
        },
      });
    } catch (err) {
      this.logger.warn('Failed to save AI insight', (err as Error).message);
      return null;
    }
  }

  // ─── List stored insights ────────────────────────────────────
  async listInsights(clinicId: string, params: { type?: string; limit?: number; offset?: number }) {
    const where: Record<string, unknown> = { clinic_id: clinicId };
    if (params.type) where.type = params.type;

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

  // ─── Get single insight ──────────────────────────────────────
  async getInsight(clinicId: string, insightId: string) {
    const insight = await this.prisma.aiInsight.findUnique({
      where: { id: insightId },
    });
    if (!insight || insight.clinic_id !== clinicId) {
      throw new NotFoundException('AI insight not found');
    }
    return insight;
  }

  // ─── Usage Stats ───────────────────────────────────────────
  async getUsageStats(clinicId: string) {
    const [clinic, byType, byUser, globalSetting] = await Promise.all([
      // Clinic usage + plan quota + override
      this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { ai_usage_count: true, ai_quota_override: true, plan: { select: { ai_quota: true, name: true } } },
      }),
      // Breakdown by type
      this.prisma.aiInsight.groupBy({
        by: ['type'],
        where: { clinic_id: clinicId },
        _count: true,
        orderBy: { _count: { type: 'desc' } },
      }),
      // Breakdown by user
      this.prisma.aiInsight.groupBy({
        by: ['generated_by'],
        where: { clinic_id: clinicId, generated_by: { not: null } },
        _count: true,
        orderBy: { _count: { generated_by: 'desc' } },
      }),
      // Global AI quota setting
      this.prisma.globalSetting.findUnique({ where: { key: 'global_ai_quota' } }).catch(() => null),
    ]);

    // Resolve effective quota: clinic override > global > default 500
    const globalQuota = globalSetting?.value ? parseInt(globalSetting.value, 10) : NaN;
    const effectiveQuota = clinic?.ai_quota_override !== null && clinic?.ai_quota_override !== undefined
      ? clinic.ai_quota_override
      : !isNaN(globalQuota) ? globalQuota : 500;

    // Resolve user names
    const userIds = byUser.map((u) => u.generated_by).filter(Boolean) as string[];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      used: clinic?.ai_usage_count ?? 0,
      quota: effectiveQuota,
      plan_name: clinic?.plan?.name ?? null,
      is_unlimited: effectiveQuota === 0,
      quota_source: clinic?.ai_quota_override !== null && clinic?.ai_quota_override !== undefined
        ? 'clinic' : !isNaN(globalQuota) ? 'global' : 'default',
      by_type: byType.map((t) => ({
        type: t.type,
        count: t._count,
      })),
      by_user: byUser.map((u) => ({
        user_id: u.generated_by,
        name: userMap.get(u.generated_by!)?.name ?? 'Unknown',
        role: userMap.get(u.generated_by!)?.role ?? '',
        count: u._count,
      })),
    };
  }

  // ─── Delete insight ──────────────────────────────────────────
  async deleteInsight(clinicId: string, insightId: string) {
    const insight = await this.prisma.aiInsight.findUnique({
      where: { id: insightId },
    });
    if (!insight || insight.clinic_id !== clinicId) {
      throw new NotFoundException('AI insight not found');
    }
    await this.prisma.aiInsight.delete({ where: { id: insightId } });
    return { deleted: true };
  }

  private async callVisionLLM(systemPrompt: string, userPrompt: string, imageBase64: string, mimeType: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
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
      if (!content) throw new BadRequestException('AI returned empty response');
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Vision LLM call failed', (error as Error).stack);
      throw new BadRequestException('AI X-ray analysis temporarily unavailable. Please try again.');
    }
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
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
        throw new BadRequestException('AI returned empty response');
      }

      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('LLM call failed', (error as Error).stack);
      throw new BadRequestException('AI service temporarily unavailable. Please try again.');
    }
  }

  private async getPatientContext(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        tooth_conditions: {
          include: { tooth: true },
        },
      },
    });

    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
    }

    const age = patient.date_of_birth
      ? Math.floor(
          (Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        )
      : patient.age ?? null;

    const toothChart = patient.tooth_conditions.map((tc) => ({
      tooth: tc.tooth.fdi_number?.toString() || tc.tooth.name,
      condition: tc.condition,
      severity: tc.severity ?? undefined,
      notes: tc.notes ?? undefined,
    }));

    return { patient, age, toothChart };
  }

  // ─── 1. Clinical Notes ──────────────────────────────────────────

  async generateClinicalNotes(clinicId: string, dto: GenerateClinicalNotesDto) {
    const { patient, age, toothChart } = await this.getPatientContext(clinicId, dto.patient_id);

    const userPrompt = buildClinicalNotesUserPrompt({
      dentist_notes: dto.dentist_notes,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_age: age,
      patient_gender: patient.gender,
      chief_complaint: dto.chief_complaint,
      allergies: patient.allergies ?? undefined,
      existing_conditions: patient.medical_history
        ? Object.entries(patient.medical_history as Record<string, unknown>)
            .filter(([, v]) => v === true)
            .map(([k]) => k)
        : undefined,
      tooth_chart: toothChart,
    });

    this.logger.log(`Generating clinical notes for patient ${dto.patient_id}`);
    const result = await this.callLLM(CLINICAL_NOTES_SYSTEM_PROMPT, userPrompt);

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
      data: response as Record<string, unknown>,
      context: { patient_id: dto.patient_id, chief_complaint: dto.chief_complaint },
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 2. Prescription ───────────────────────────────────────────

  async generatePrescription(clinicId: string, dto: GeneratePrescriptionDto) {
    const { patient, age } = await this.getPatientContext(clinicId, dto.patient_id);

    const userPrompt = buildPrescriptionUserPrompt({
      diagnosis: dto.diagnosis,
      procedures_performed: dto.procedures_performed,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_age: age,
      patient_gender: patient.gender,
      allergies: patient.allergies ?? undefined,
      medical_history: (patient.medical_history as Record<string, unknown>) ?? undefined,
      existing_medications: dto.existing_medications,
      tooth_numbers: dto.tooth_numbers,
    });

    this.logger.log(`Generating prescription for patient ${dto.patient_id}`);
    const result = await this.callLLM(PRESCRIPTION_SYSTEM_PROMPT, userPrompt);

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
      data: response as Record<string, unknown>,
      context: { patient_id: dto.patient_id, diagnosis: dto.diagnosis },
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 3. Treatment Plan ─────────────────────────────────────────

  async generateTreatmentPlan(clinicId: string, dto: GenerateTreatmentPlanDto) {
    const { patient, age, toothChart } = await this.getPatientContext(clinicId, dto.patient_id);

    // Fetch existing treatments for context
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

    // Fetch clinic's treatment catalog for pricing
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

    const userPrompt = buildTreatmentPlanUserPrompt({
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_age: age,
      patient_gender: patient.gender,
      medical_history: (patient.medical_history as Record<string, unknown>) ?? undefined,
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
    const result = await this.callLLM(TREATMENT_PLAN_SYSTEM_PROMPT, userPrompt);

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
      data: response as Record<string, unknown>,
      context: { patient_id: dto.patient_id, chief_complaint: dto.chief_complaint },
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 4. Revenue Insights ───────────────────────────────────────

  async generateRevenueInsights(clinicId: string, dto: GenerateRevenueInsightsDto) {
    const dateFilter = {
      gte: new Date(dto.start_date),
      lte: new Date(dto.end_date),
    };
    const branchFilter = dto.branch_id ? { branch_id: dto.branch_id } : {};

    // Gather all report data in parallel
    const [invoices, appointments, patients, treatments, dentists, inventoryAlerts] =
      await Promise.all([
        // Revenue
        this.prisma.invoice.aggregate({
          where: { clinic_id: clinicId, ...branchFilter, created_at: dateFilter },
          _sum: { total_amount: true, net_amount: true, discount_amount: true, tax_amount: true },
          _count: true,
        }),
        // Appointments
        this.prisma.appointment.groupBy({
          by: ['status'],
          where: { clinic_id: clinicId, ...branchFilter, appointment_date: dateFilter },
          _count: true,
        }),
        // Patients
        this.prisma.patient.aggregate({
          where: { clinic_id: clinicId, ...branchFilter, created_at: dateFilter },
          _count: true,
        }),
        // Treatment procedures
        this.prisma.treatment.groupBy({
          by: ['procedure'],
          where: { clinic_id: clinicId, ...branchFilter, created_at: dateFilter },
          _count: true,
          orderBy: { _count: { procedure: 'desc' } },
          take: 10,
        }),
        // Dentist performance
        this.prisma.user.findMany({
          where: { clinic_id: clinicId, role: 'Dentist' },
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
        // Inventory alerts (raw query for field-to-field comparison)
        this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*)::bigint as count FROM inventory_items WHERE clinic_id = $1 AND quantity <= reorder_level`,
          clinicId,
        ).then((r) => Number(r[0]?.count ?? 0)).catch(() => 0),
      ]);

    const apptByStatus = Object.fromEntries(
      appointments.map((a) => [a.status, a._count]),
    );
    const totalAppts = appointments.reduce((sum, a) => sum + a._count, 0);

    const totalRevenue = Number(invoices._sum?.total_amount ?? 0);
    const netAmount = Number(invoices._sum?.net_amount ?? 0);

    const userPrompt = buildRevenueInsightsUserPrompt({
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
        revenue_generated: d.treatments.reduce((sum: number, t: { cost: unknown }) => sum + Number(t.cost), 0),
      })),
      inventory_alerts: inventoryAlerts,
      date_range: `${dto.start_date} to ${dto.end_date}`,
      currency_symbol: await this.getClinicCurrencySymbol(clinicId),
    });

    this.logger.log(`Generating revenue insights for clinic ${clinicId}`);
    const result = await this.callLLM(REVENUE_INSIGHTS_SYSTEM_PROMPT, userPrompt);

    const response = {
      ...result,
      generated_at: new Date().toISOString(),
    };

    // Store the insight
    const saved = await this.saveInsight({
      clinicId,
      type: 'revenue_insights',
      title: `Revenue Insights: ${dto.start_date} to ${dto.end_date}`,
      data: response as Record<string, unknown>,
      context: { start_date: dto.start_date, end_date: dto.end_date, branch_id: dto.branch_id },
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 5. Dental Chart Analysis ──────────────────────────────────

  async generateChartAnalysis(clinicId: string, dto: GenerateChartAnalysisDto) {
    const { patient, age } = await this.getPatientContext(clinicId, dto.patient_id);

    const conditions = await this.prisma.patientToothCondition.findMany({
      where: { patient_id: dto.patient_id, clinic_id: clinicId },
      include: { tooth: true },
    });

    const totalTeeth = await this.prisma.tooth.count();

    const userPrompt = buildDentalChartAnalysisUserPrompt({
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_age: age,
      patient_gender: patient.gender,
      medical_history: (patient.medical_history as Record<string, unknown>) ?? undefined,
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
    const result = await this.callLLM(DENTAL_CHART_ANALYSIS_SYSTEM_PROMPT, userPrompt);

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
      data: response as Record<string, unknown>,
      context: { patient_id: dto.patient_id },
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 6. Appointment Summary ────────────────────────────────────

  async generateAppointmentSummary(clinicId: string, dto: GenerateAppointmentSummaryDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointment_id },
      include: {
        patient: true,
        dentist: true,
      },
    });

    if (!appointment || appointment.clinic_id !== clinicId) {
      throw new NotFoundException(`Appointment not found`);
    }

    const apptDate = appointment.appointment_date.toISOString().split('T')[0];

    // Get treatments done around this appointment date
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

    // Get prescriptions from same date
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
      ? Math.floor(
          (Date.now() - new Date(appointment.patient.date_of_birth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : appointment.patient.age ?? null;

    const userPrompt = buildAppointmentSummaryUserPrompt({
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
    const result = await this.callLLM(APPOINTMENT_SUMMARY_SYSTEM_PROMPT, userPrompt);

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
      data: response as Record<string, unknown>,
      context: { appointment_id: dto.appointment_id },
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 7. Campaign Content Generator ─────────────────────────────

  async generateCampaignContent(clinicId: string, dto: GenerateCampaignContentDto) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const userPrompt = buildCampaignContentUserPrompt({
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
    const result = await this.callLLM(CAMPAIGN_CONTENT_SYSTEM_PROMPT, userPrompt);

    const response = {
      ...result,
      generated_at: new Date().toISOString(),
    };

    const saved = await this.saveInsight({
      clinicId,
      type: 'campaign_content',
      title: `Campaign: ${dto.campaign_name}`,
      data: response as Record<string, unknown>,
      context: { campaign_name: dto.campaign_name, campaign_type: dto.campaign_type, channel: dto.channel },
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 8. X-ray Analysis (Vision) ────────────────────────────────

  async analyzeXray(clinicId: string, params: {
    attachmentId: string;
    notes?: string;
    userId?: string;
  }) {
    // Fetch attachment
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: params.attachmentId },
      include: { patient: true },
    });
    if (!attachment || attachment.clinic_id !== clinicId) {
      throw new NotFoundException('Attachment not found');
    }
    if (attachment.type !== 'xray') {
      throw new BadRequestException('Only X-ray attachments can be analyzed');
    }

    // Read file from disk
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    const filePath = join(process.cwd(), attachment.file_url);
    const fileBuffer = await readFile(filePath);
    const imageBase64 = fileBuffer.toString('base64');

    const patient = attachment.patient;
    const age = patient.date_of_birth
      ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : patient.age ?? null;

    const userPrompt = buildXrayAnalysisUserPrompt({
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_age: age,
      patient_gender: patient.gender,
      notes: params.notes,
    });

    this.logger.log(`Analyzing X-ray for patient ${patient.id}, attachment ${params.attachmentId}`);
    const result = await this.callVisionLLM(
      XRAY_ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      imageBase64,
      attachment.mime_type || 'image/jpeg',
    );

    const response = {
      ...result,
      attachment_id: params.attachmentId,
      patient_id: patient.id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      generated_at: new Date().toISOString(),
    };

    // Save analysis to attachment record
    await this.prisma.attachment.update({
      where: { id: params.attachmentId },
      data: { ai_analysis: response as never },
    });

    // Also save as AI insight
    const saved = await this.saveInsight({
      clinicId,
      type: 'xray_analysis',
      title: `X-ray Analysis: ${patient.first_name} ${patient.last_name}`,
      data: response as Record<string, unknown>,
      context: { attachment_id: params.attachmentId, patient_id: patient.id },
      userId: params.userId,
    });

    return { ...response, insight_id: saved?.id };
  }
}
