import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../database/prisma.service.js';
import { getCurrencySymbol } from '../../common/utils/currency.util.js';
import { AiUsageService } from './ai-usage.service.js';

interface AiCallMeta {
  clinicId: string;
  userId?: string;
  type: string;
}
import {
  GenerateClinicalNotesDto,
  GeneratePrescriptionDto,
  GenerateTreatmentPlanDto,
  GenerateRevenueInsightsDto,
  GenerateChartAnalysisDto,
  GenerateAppointmentSummaryDto,
  GenerateCampaignContentDto,
  GenerateReviewReplyDto,
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
import {
  REVIEW_REPLY_SYSTEM_PROMPT,
  buildReviewReplyUserPrompt,
} from './prompts/review-reply.prompt.js';
import {
  EXPENSE_ADVISOR_SYSTEM_PROMPT,
  buildExpenseAdvisorUserPrompt,
} from './prompts/expense-advisor.prompt.js';
import type { ExpenseAdvisorChatDto } from './dto/expense-advisor-chat.dto.js';
import { withGuardrails } from './prompts/guardrails.prompt.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly aiUsage: AiUsageService,
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
  async listInsights(clinicId: string, params: { type?: string; patient_id?: string; limit?: number; offset?: number }) {
    // Build the base where clause.
    const where: Record<string, unknown> = { clinic_id: clinicId };
    if (params.type) where.type = params.type;
    // Filter by patient_id stored inside the context JSON column.
    // Prisma JSON path filtering works on PostgreSQL with the `path` operator.
    if (params.patient_id) {
      where.context = {
        path: ['patient_id'],
        equals: params.patient_id,
      };
    }

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

    const userIds = byUser.map((u) => u.user_id).filter(Boolean) as string[];
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
        name: userMap.get(u.user_id!)?.name ?? 'Unknown',
        role: userMap.get(u.user_id!)?.role ?? '',
        count: u._count,
      })),
    };
  }

  // ─── Link insight to a saved consultation / prescription ─────
  /**
   * Attach a back-link to a stored AI insight after the dentist accepts and
   * saves the AI-generated draft. Used by the AI Copilot "Apply Consultation
   * + Prescription" flow so the audit trail can be navigated:
   *   AI insight → consultation_id / prescription_id → record page.
   * The link is merged into the existing `context` JSON; existing keys are
   * preserved so we do not lose the original input parameters.
   */
  async linkInsight(
    clinicId: string,
    insightId: string,
    links: {
      consultation_id?: string;
      prescription_id?: string;
      reviewed_by?: string;
      reviewed_at?: string;
    },
  ) {
    const insight = await this.prisma.aiInsight.findUnique({
      where: { id: insightId },
    });
    if (!insight || insight.clinic_id !== clinicId) {
      throw new NotFoundException('AI insight not found');
    }
    const prevContext = (insight.context as Record<string, unknown> | null) ?? {};
    const newContext = {
      ...prevContext,
      ...(links.consultation_id ? { consultation_id: links.consultation_id } : {}),
      ...(links.prescription_id ? { prescription_id: links.prescription_id } : {}),
      ...(links.reviewed_by ? { reviewed_by: links.reviewed_by } : {}),
      ...(links.reviewed_at ? { reviewed_at: links.reviewed_at } : {}),
    };
    return this.prisma.aiInsight.update({
      where: { id: insightId },
      data: { context: newContext as never },
    });
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

  private async callVisionLLM(
    systemPrompt: string,
    userPrompt: string,
    imageBase64: string,
    mimeType: string,
    meta: AiCallMeta,
    featureName = 'dental X-ray analysis',
  ): Promise<Record<string, unknown>> {
    const model = 'gpt-4o';
    const guardedPrompt = withGuardrails(systemPrompt, featureName);
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: guardedPrompt },
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

      await this.aiUsage.recordUsage({
        clinicId: meta.clinicId,
        userId: meta.userId,
        type: meta.type,
        model,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      }).catch((e) => this.logger.warn(`recordUsage failed: ${(e as Error).message}`));

      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      await this.aiUsage.releaseReservation(meta.clinicId).catch(() => undefined);
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Vision LLM call failed', (error as Error).stack);
      throw new BadRequestException('AI X-ray analysis temporarily unavailable. Please try again.');
    }
  }

  private async callLLM(
    systemPrompt: string,
    userPrompt: string,
    meta: AiCallMeta,
    maxTokens = 2000,
    featureName = 'AI assistance',
  ): Promise<Record<string, unknown>> {
    const guardedPrompt = withGuardrails(systemPrompt, featureName);
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: guardedPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new BadRequestException('AI returned empty response');
      }

      await this.aiUsage.recordUsage({
        clinicId: meta.clinicId,
        userId: meta.userId,
        type: meta.type,
        model: this.model,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      }).catch((e) => this.logger.warn(`recordUsage failed: ${(e as Error).message}`));

      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      await this.aiUsage.releaseReservation(meta.clinicId).catch(() => undefined);
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

  async generateClinicalNotes(clinicId: string, dto: GenerateClinicalNotesDto, userId?: string) {
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
    const result = await this.callLLM(CLINICAL_NOTES_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'clinical_notes',
    }, 2000, 'clinical note generation');

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
      userId,
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 2. Prescription ───────────────────────────────────────────

  async generatePrescription(clinicId: string, dto: GeneratePrescriptionDto, userId?: string) {
    const { patient, age } = await this.getPatientContext(clinicId, dto.patient_id);

    const mergedAllergies = [patient.allergies, dto.allergies_medical_history]
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join(' | ') || undefined;

    // Fetch in-stock inventory so the LLM can prefer what's actually available.
    // Cap at 200 so the prompt stays compact for large pharmacies.
    const inventory = dto.branch_id
      ? await this.prisma.inventoryItem.findMany({
          where: { clinic_id: clinicId, branch_id: dto.branch_id, quantity: { gt: 0 } },
          select: { id: true, name: true, category: true, quantity: true, unit: true },
          take: 200,
        })
      : [];

    const userPrompt = buildPrescriptionUserPrompt({
      diagnosis: dto.diagnosis,
      chief_complaint: dto.chief_complaint,
      past_dental_history: dto.past_dental_history,
      procedures_performed: dto.procedures_performed,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_age: age,
      patient_gender: patient.gender,
      allergies: mergedAllergies,
      medical_history: (patient.medical_history as Record<string, unknown>) ?? undefined,
      existing_medications: dto.existing_medications,
      tooth_numbers: dto.tooth_numbers,
      available_inventory: inventory.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
      })),
    });

    this.logger.log(`Generating prescription for patient ${dto.patient_id}`);
    const result = await this.callLLM(PRESCRIPTION_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'prescription',
    }, 2000, 'dental prescription generation');

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
      userId,
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 3. Treatment Plan ─────────────────────────────────────────

  async generateTreatmentPlan(clinicId: string, dto: GenerateTreatmentPlanDto, userId?: string) {
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
      dentist_notes: dto.dentist_notes,
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
    const result = await this.callLLM(TREATMENT_PLAN_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'treatment_plan',
    }, 2000, 'treatment plan generation');

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
      userId,
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 4. Revenue Insights ───────────────────────────────────────

  async generateRevenueInsights(clinicId: string, dto: GenerateRevenueInsightsDto, userId?: string) {
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
          where: { clinic_id: clinicId, OR: [{ role: { in: ['Dentist', 'Consultant'] } }, { is_doctor: true }] },
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
    const result = await this.callLLM(REVENUE_INSIGHTS_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'revenue_insights',
    }, 2000, 'clinic revenue and operational insights');

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
      userId,
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 4b. Expense Advisor Chat (Spendly) ────────────────────────

  /**
   * Conversational expense advisor. Gathers the clinic's expense context
   * for this month + last month + top vendors and asks the LLM to answer
   * the user's question grounded in that data.
   */
  async chatExpenseAdvisor(clinicId: string, dto: ExpenseAdvisorChatDto, userId?: string) {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const branchWhere = dto.branch_id ? { branch_id: dto.branch_id } : {};

    const [
      thisMonthExpenses,
      lastMonthExpenses,
      thisMonthInvoices,
      lastMonthInvoices,
      branch,
    ] = await Promise.all([
      this.prisma.expense.findMany({
        where: { clinic_id: clinicId, ...branchWhere, date: { gte: thisMonthStart, lte: thisMonthEnd } },
        select: { amount: true, vendor: true, category: { select: { name: true } } },
      }),
      this.prisma.expense.findMany({
        where: { clinic_id: clinicId, ...branchWhere, date: { gte: lastMonthStart, lte: lastMonthEnd } },
        select: { amount: true, category: { select: { name: true } } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { invoice: { clinic_id: clinicId, ...branchWhere }, paid_at: { gte: thisMonthStart, lte: thisMonthEnd } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { invoice: { clinic_id: clinicId, ...branchWhere }, paid_at: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      dto.branch_id
        ? this.prisma.branch.findUnique({ where: { id: dto.branch_id }, select: { name: true } })
        : Promise.resolve(null),
    ]);

    // Roll up this month by category
    const thisMonthByCat = new Map<string, { total: number; count: number }>();
    for (const e of thisMonthExpenses) {
      const cat = e.category?.name ?? 'Uncategorized';
      const cur = thisMonthByCat.get(cat) ?? { total: 0, count: 0 };
      cur.total += Number(e.amount);
      cur.count += 1;
      thisMonthByCat.set(cat, cur);
    }
    const thisMonthTotal = Array.from(thisMonthByCat.values()).reduce((s, v) => s + v.total, 0);
    const currentMonthByCategory = Array.from(thisMonthByCat.entries())
      .map(([category_name, v]) => ({
        category_name,
        total: Math.round(v.total * 100) / 100,
        count: v.count,
        pct_of_month: thisMonthTotal > 0 ? Math.round((v.total / thisMonthTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Last month rollup
    const lastMonthByCat = new Map<string, number>();
    for (const e of lastMonthExpenses) {
      const cat = e.category?.name ?? 'Uncategorized';
      lastMonthByCat.set(cat, (lastMonthByCat.get(cat) ?? 0) + Number(e.amount));
    }
    const lastMonthTotal = Array.from(lastMonthByCat.values()).reduce((s, v) => s + v, 0);
    const lastMonthByCategory = Array.from(lastMonthByCat.entries())
      .map(([category_name, total]) => ({ category_name, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    // Top vendors this month
    const vendorMap = new Map<string, { total: number; count: number }>();
    for (const e of thisMonthExpenses) {
      const v = e.vendor?.trim();
      if (!v) continue;
      const cur = vendorMap.get(v) ?? { total: 0, count: 0 };
      cur.total += Number(e.amount);
      cur.count += 1;
      vendorMap.set(v, cur);
    }
    const topVendors = Array.from(vendorMap.entries())
      .map(([vendor, v]) => ({ vendor, total: Math.round(v.total * 100) / 100, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const currentMonthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const userPrompt = buildExpenseAdvisorUserPrompt({
      message: dto.message,
      history: dto.history,
      context: {
        current_month_label: currentMonthLabel,
        current_month_total: Math.round(thisMonthTotal * 100) / 100,
        last_month_total: lastMonthExpenses.length > 0 ? Math.round(lastMonthTotal * 100) / 100 : null,
        current_month_by_category: currentMonthByCategory,
        last_month_by_category: lastMonthByCategory,
        top_vendors: topVendors,
        current_month_revenue: Math.round(Number(thisMonthInvoices._sum.amount ?? 0) * 100) / 100,
        last_month_revenue: lastMonthInvoices._sum.amount != null
          ? Math.round(Number(lastMonthInvoices._sum.amount) * 100) / 100
          : null,
        branch_name: branch?.name,
      },
    });

    // Input sanitization — truncate excessively long messages to prevent injection
    if (dto.message.length > 1000) {
      throw new BadRequestException('Message too long. Please keep your question under 1000 characters.');
    }
    if (dto.history && dto.history.length > 20) {
      throw new BadRequestException('Conversation history too long. Please start a new conversation.');
    }

    this.logger.log(`Spendly chat for clinic ${clinicId} (msg len ${dto.message.length})`);
    const result = await this.callLLM(EXPENSE_ADVISOR_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'expense_advisor',
    }, 2000, 'clinic expense analysis and financial advice');

    return {
      response: typeof result.response === 'string' ? result.response : '',
      suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : [],
      generated_at: new Date().toISOString(),
    };
  }

  // ─── 5. Dental Chart Analysis ──────────────────────────────────

  async generateChartAnalysis(clinicId: string, dto: GenerateChartAnalysisDto, userId?: string) {
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
    const result = await this.callLLM(DENTAL_CHART_ANALYSIS_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'chart_analysis',
    }, 2000, 'dental chart risk analysis');

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
      userId,
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 6. Appointment Summary ────────────────────────────────────

  async generateAppointmentSummary(clinicId: string, dto: GenerateAppointmentSummaryDto, userId?: string) {
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
    const result = await this.callLLM(APPOINTMENT_SUMMARY_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'appointment_summary',
    }, 2000, 'appointment visit summary generation');

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
      userId,
    });

    return { ...response, insight_id: saved?.id };
  }

  // ─── 7. Campaign Content Generator ─────────────────────────────

  async generateCampaignContent(clinicId: string, dto: GenerateCampaignContentDto, userId?: string) {
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
    const result = await this.callLLM(CAMPAIGN_CONTENT_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'campaign_content',
    }, 2000, 'WhatsApp and SMS campaign content generation for this clinic');

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
      userId,
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
      { clinicId, userId: params.userId, type: 'xray_analysis' },
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

  // ─── 9. Google Review Reply ───────────────────────────────────

  /**
   * Generate a draft reply to a Google review. Returns structured output
   * including the reply text, detected language, sentiment, and a safety
   * flag for whether the reply is OK to auto-post without human review.
   *
   * The caller (GoogleReviewsService) is responsible for reserving the
   * AI quota slot beforehand — same contract as the other generators.
   */
  async generateReviewReply(
    clinicId: string,
    dto: GenerateReviewReplyDto,
    userId?: string,
  ): Promise<{
    reply: string;
    language: string;
    sentiment: string;
    is_safe_to_auto_post: boolean;
    review_summary: string;
  }> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, phone: true },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const userPrompt = buildReviewReplyUserPrompt({
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
    const result = await this.callLLM(REVIEW_REPLY_SYSTEM_PROMPT, userPrompt, {
      clinicId,
      userId,
      type: 'review_reply',
    }, 2000, 'Google review reply drafting for this clinic');

    return {
      reply: String(result['reply'] ?? '').trim(),
      language: String(result['language'] ?? 'en'),
      sentiment: String(result['sentiment'] ?? 'neutral'),
      is_safe_to_auto_post: Boolean(result['is_safe_to_auto_post'] ?? false),
      review_summary: String(result['review_summary'] ?? ''),
    };
  }

  // ─── 10. Consent Template Generator ───────────────────────────

  /**
   * Generate a consent template body in the requested language.
   *
   * Quota reservation must be performed by the caller (ConsentService) via
   * `@TrackAiUsage()` before invoking this method — same contract as the
   * other generators. Returns the parsed body object only; the caller is
   * responsible for persisting it as a `ConsentTemplate` row.
   */
  async generateConsentTemplate(
    clinicId: string,
    systemPrompt: string,
    userPrompt: string,
    userId?: string,
  ): Promise<{ title: string; body: Record<string, unknown> }> {
    const result = await this.callLLM(systemPrompt, userPrompt, {
      clinicId,
      userId,
      type: 'consent_form',
    }, 4000, 'dental consent form template generation');

    const title = String(result['title'] ?? '').trim();
    const body = (result['body'] && typeof result['body'] === 'object' ? result['body'] : null) as
      | Record<string, unknown>
      | null;
    if (!title || !body) {
      throw new BadRequestException('AI returned an invalid consent template');
    }
    return { title, body };
  }
}
