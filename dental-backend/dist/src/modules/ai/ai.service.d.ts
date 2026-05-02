import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { AiUsageService } from './ai-usage.service.js';
import { GenerateClinicalNotesDto, GeneratePrescriptionDto, GenerateTreatmentPlanDto, GenerateRevenueInsightsDto, GenerateChartAnalysisDto, GenerateAppointmentSummaryDto, GenerateCampaignContentDto, GenerateReviewReplyDto } from './dto/index.js';
export declare class AiService {
    private readonly prisma;
    private readonly config;
    private readonly aiUsage;
    private readonly logger;
    private readonly openai;
    private readonly model;
    constructor(prisma: PrismaService, config: ConfigService, aiUsage: AiUsageService);
    private getClinicCurrencySymbol;
    private saveInsight;
    listInsights(clinicId: string, params: {
        type?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        items: {
            id: string;
            created_at: Date;
            data: import("@prisma/client/runtime/client").JsonValue;
            clinic_id: string;
            type: string;
            title: string;
            context: import("@prisma/client/runtime/client").JsonValue | null;
            generated_by: string | null;
        }[];
        total: number;
    }>;
    getInsight(clinicId: string, insightId: string): Promise<{
        id: string;
        created_at: Date;
        data: import("@prisma/client/runtime/client").JsonValue;
        clinic_id: string;
        type: string;
        title: string;
        context: import("@prisma/client/runtime/client").JsonValue | null;
        generated_by: string | null;
    }>;
    getUsageStats(clinicId: string): Promise<{
        base_quota: number;
        overage_cap: number;
        overage_enabled: boolean;
        approved_extra: number;
        used: number;
        used_base: number;
        used_overage: number;
        effective_quota: number;
        remaining: number;
        cycle_start: Date;
        cycle_end: Date;
        is_blocked_unpaid: boolean;
        pending_charge: {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            notes: string | null;
            cycle_start: Date;
            cycle_end: Date;
            base_quota: number;
            overage_requests_count: number;
            approved_requests_count: number;
            total_cost_inr: import("@prisma/client-runtime-utils").Decimal;
            paid_at: Date | null;
            paid_by_super_admin_id: string | null;
            payment_reference: string | null;
        } | null;
        plan_name: string | null;
        current_cycle_overage_cost_inr: number;
        current_cycle_overage_count: number;
        by_type: {
            type: string;
            count: number;
        }[];
        by_user: {
            user_id: string | null;
            name: string;
            role: string;
            count: number;
        }[];
    }>;
    deleteInsight(clinicId: string, insightId: string): Promise<{
        deleted: boolean;
    }>;
    private callVisionLLM;
    private callLLM;
    private getPatientContext;
    generateClinicalNotes(clinicId: string, dto: GenerateClinicalNotesDto, userId?: string): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generatePrescription(clinicId: string, dto: GeneratePrescriptionDto, userId?: string): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateTreatmentPlan(clinicId: string, dto: GenerateTreatmentPlanDto, userId?: string): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateRevenueInsights(clinicId: string, dto: GenerateRevenueInsightsDto, userId?: string): Promise<{
        insight_id: string | undefined;
        generated_at: string;
    }>;
    generateChartAnalysis(clinicId: string, dto: GenerateChartAnalysisDto, userId?: string): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateAppointmentSummary(clinicId: string, dto: GenerateAppointmentSummaryDto, userId?: string): Promise<{
        insight_id: string | undefined;
        appointment_id: string;
        patient_name: string;
        dentist_name: string;
        generated_at: string;
    }>;
    generateCampaignContent(clinicId: string, dto: GenerateCampaignContentDto, userId?: string): Promise<{
        insight_id: string | undefined;
        generated_at: string;
    }>;
    analyzeXray(clinicId: string, params: {
        attachmentId: string;
        notes?: string;
        userId?: string;
    }): Promise<{
        insight_id: string | undefined;
        attachment_id: string;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateReviewReply(clinicId: string, dto: GenerateReviewReplyDto, userId?: string): Promise<{
        reply: string;
        language: string;
        sentiment: string;
        is_safe_to_auto_post: boolean;
        review_summary: string;
    }>;
    generateConsentTemplate(clinicId: string, systemPrompt: string, userPrompt: string, userId?: string): Promise<{
        title: string;
        body: Record<string, unknown>;
    }>;
}
