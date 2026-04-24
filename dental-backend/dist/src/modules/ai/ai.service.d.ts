import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { GenerateClinicalNotesDto, GeneratePrescriptionDto, GenerateTreatmentPlanDto, GenerateRevenueInsightsDto, GenerateChartAnalysisDto, GenerateAppointmentSummaryDto, GenerateCampaignContentDto } from './dto/index.js';
export declare class AiService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private readonly openai;
    private readonly model;
    constructor(prisma: PrismaService, config: ConfigService);
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
    deleteInsight(clinicId: string, insightId: string): Promise<{
        deleted: boolean;
    }>;
    private callVisionLLM;
    private callLLM;
    private getPatientContext;
    generateClinicalNotes(clinicId: string, dto: GenerateClinicalNotesDto): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generatePrescription(clinicId: string, dto: GeneratePrescriptionDto): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateTreatmentPlan(clinicId: string, dto: GenerateTreatmentPlanDto): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateRevenueInsights(clinicId: string, dto: GenerateRevenueInsightsDto): Promise<{
        insight_id: string | undefined;
        generated_at: string;
    }>;
    generateChartAnalysis(clinicId: string, dto: GenerateChartAnalysisDto): Promise<{
        insight_id: string | undefined;
        patient_id: string;
        patient_name: string;
        generated_at: string;
    }>;
    generateAppointmentSummary(clinicId: string, dto: GenerateAppointmentSummaryDto): Promise<{
        insight_id: string | undefined;
        appointment_id: string;
        patient_name: string;
        dentist_name: string;
        generated_at: string;
    }>;
    generateCampaignContent(clinicId: string, dto: GenerateCampaignContentDto): Promise<{
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
}
