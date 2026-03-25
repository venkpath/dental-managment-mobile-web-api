import type { Request } from 'express';
import { AiService } from './ai.service.js';
import { GenerateClinicalNotesDto, GeneratePrescriptionDto, GenerateTreatmentPlanDto, GenerateRevenueInsightsDto, GenerateChartAnalysisDto, GenerateAppointmentSummaryDto, GenerateCampaignContentDto } from './dto/index.js';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
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
        used: number;
        quota: number;
        plan_name: string | null;
        is_unlimited: boolean;
        quota_source: string;
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
    listInsights(req: Request, type?: string, limit?: string, offset?: string): Promise<{
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
}
