import type { Request } from 'express';
import { AiService } from './ai.service.js';
import { AiUsageService } from './ai-usage.service.js';
import { GenerateClinicalNotesDto, GeneratePrescriptionDto, GenerateTreatmentPlanDto, GenerateRevenueInsightsDto, GenerateChartAnalysisDto, GenerateAppointmentSummaryDto, GenerateCampaignContentDto, UpdateAiSettingsDto, CreateAiQuotaApprovalRequestDto } from './dto/index.js';
export declare class AiController {
    private readonly aiService;
    private readonly aiUsageService;
    constructor(aiService: AiService, aiUsageService: AiUsageService);
    generateClinicalNotes(req: Request, dto: GenerateClinicalNotesDto): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generatePrescription(req: Request, dto: GeneratePrescriptionDto): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateTreatmentPlan(req: Request, dto: GenerateTreatmentPlanDto): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateRevenueInsights(req: Request, dto: GenerateRevenueInsightsDto): Promise<{
        insight_id: string | undefined;
        generated_at: string;
    }>;
    generateChartAnalysis(req: Request, dto: GenerateChartAnalysisDto): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateAppointmentSummary(req: Request, dto: GenerateAppointmentSummaryDto): Promise<{
        insight_id: string | undefined;
        appointment_id: string;
        patient_name: string;
        dentist_name: string;
        generated_at: string;
    }>;
    generateCampaignContent(req: Request, dto: GenerateCampaignContentDto): Promise<{
        insight_id: string | undefined;
        generated_at: string;
    }>;
    analyzeXray(req: Request, body: {
        attachment_id: string;
        notes?: string;
    }): Promise<{
        insight_id: string | undefined;
        attachment_id: string;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    getUsageStats(req: Request): Promise<{
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
    updateAiSettings(req: Request, dto: UpdateAiSettingsDto): Promise<{
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        overage_enabled: boolean;
        current_cycle_start: Date;
        current_cycle_end: Date;
        used_in_cycle: number;
        approved_extra: number;
        approved_extra_reason: string | null;
    }>;
    createApprovalRequest(req: Request, dto: CreateAiQuotaApprovalRequestDto): Promise<{
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        cycle_start: Date;
        requested_by: string | null;
        requested_amount: number;
        reason: string;
        approved_amount: number | null;
        approved_by: string | null;
        decision_note: string | null;
        decided_at: Date | null;
    }>;
    listMyApprovalRequests(req: Request): Promise<{
        id: string;
        status: string;
        created_at: Date;
        clinic_id: string;
        cycle_start: Date;
        requested_by: string | null;
        requested_amount: number;
        reason: string;
        approved_amount: number | null;
        approved_by: string | null;
        decision_note: string | null;
        decided_at: Date | null;
    }[]>;
    listInsights(req: Request, type?: string, patientId?: string, limit?: string, offset?: string): Promise<{
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
    getInsight(req: Request, id: string): Promise<{
        id: string;
        created_at: Date;
        data: import("@prisma/client/runtime/client").JsonValue;
        clinic_id: string;
        type: string;
        title: string;
        context: import("@prisma/client/runtime/client").JsonValue | null;
        generated_by: string | null;
    }>;
    deleteInsight(req: Request, id: string): Promise<{
        deleted: boolean;
    }>;
    linkInsight(req: Request, id: string, body: {
        consultation_id?: string;
        prescription_id?: string;
    }): Promise<{
        id: string;
        created_at: Date;
        data: import("@prisma/client/runtime/client").JsonValue;
        clinic_id: string;
        type: string;
        title: string;
        context: import("@prisma/client/runtime/client").JsonValue | null;
        generated_by: string | null;
    }>;
}
