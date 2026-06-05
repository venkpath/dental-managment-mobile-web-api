import { PrismaService } from '../../database/prisma.service.js';
import { QueryInsightsDto } from './dto/query-insights.dto.js';
export declare class PatientInsightsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    computeAllClinics(): Promise<void>;
    computeForClinic(clinicId: string, branchId?: string, triggeredBy?: 'manual' | 'cron' | 'event'): Promise<{
        batch_id: string;
        patient_count: number;
    }>;
    private scorePatient;
    getSummary(clinicId: string, branchId?: string): Promise<{
        no_show: {
            high: number;
            medium: number;
            total: number;
        };
        recall: {
            total: number;
        };
        churn: {
            high: number;
            medium: number;
            total: number;
        };
        conversion: {
            total: number;
            potential_revenue: number;
        };
        total_at_risk: number;
        confidence_score: number;
        last_computed_at: Date | null;
    }>;
    getList(clinicId: string, dto: QueryInsightsDto): Promise<{
        data: ({
            patient: {
                id: string;
                phone: string;
                appointments: {
                    appointment_date: Date;
                    start_time: string;
                }[];
                profile_photo_url: string | null;
                first_name: string;
                last_name: string;
            };
        } & {
            id: string;
            clinic_id: string;
            branch_id: string;
            patient_id: string;
            batch_id: string | null;
            no_show_score: number;
            no_show_risk: string;
            no_show_factors: import("@prisma/client/runtime/client").JsonValue | null;
            recall_due: boolean;
            recall_due_days: number | null;
            recall_treatment: string | null;
            recall_last_date: Date | null;
            churn_score: number;
            churn_risk: string;
            days_since_visit: number | null;
            churn_factors: import("@prisma/client/runtime/client").JsonValue | null;
            conversion_score: number;
            conversion_interest: string | null;
            conversion_value: import("@prisma/client-runtime-utils").Decimal;
            confidence_score: number;
            computed_at: Date;
        })[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getPatientScore(clinicId: string, patientId: string): Promise<{
        id: string;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        batch_id: string | null;
        no_show_score: number;
        no_show_risk: string;
        no_show_factors: import("@prisma/client/runtime/client").JsonValue | null;
        recall_due: boolean;
        recall_due_days: number | null;
        recall_treatment: string | null;
        recall_last_date: Date | null;
        churn_score: number;
        churn_risk: string;
        days_since_visit: number | null;
        churn_factors: import("@prisma/client/runtime/client").JsonValue | null;
        conversion_score: number;
        conversion_interest: string | null;
        conversion_value: import("@prisma/client-runtime-utils").Decimal;
        confidence_score: number;
        computed_at: Date;
    }>;
    getBatchStatus(batchId: string, clinicId: string): Promise<{
        id: string;
        status: string;
        error_message: string | null;
        started_at: Date;
        completed_at: Date | null;
        patient_count: number;
    }>;
    getLatestBatch(clinicId: string): Promise<{
        id: string;
        status: string;
        started_at: Date;
        completed_at: Date | null;
        patient_count: number;
    } | null>;
}
