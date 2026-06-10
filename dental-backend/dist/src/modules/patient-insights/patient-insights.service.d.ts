import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { QueryInsightsDto, RecordActionDto } from './dto/query-insights.dto.js';
import { type RecoveredSummaryResult } from './patient-insights.opportunity.js';
export declare class PatientInsightsService {
    private readonly prisma;
    private readonly auditLog;
    private readonly logger;
    constructor(prisma: PrismaService, auditLog: AuditLogService);
    computeAllClinics(): Promise<void>;
    computeForClinic(clinicId: string, branchId?: string, triggeredBy?: 'manual' | 'cron' | 'event'): Promise<{
        batch_id: string;
        patient_count: number;
    }>;
    computeForPatient(clinicId: string, patientId: string): Promise<void>;
    attributeBookingAfterOutreach(clinicId: string, patientId: string, appointmentId: string): Promise<void>;
    attributeNoShowAttendance(clinicId: string, patientId: string, appointmentId: string): Promise<void>;
    attributeWalkInAfterOutreach(clinicId: string, patientId: string, effectiveAt?: Date): Promise<void>;
    stampCampaignContacts(clinicId: string, patientIds: string[], type: 'recall' | 'churn'): Promise<void>;
    private applyWindowManagement;
    private upsertPatientScore;
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
        outreach_recent: number;
        attributed_bookings: number;
        attribution_window_days: number;
        campaign_cooldown_days: number;
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
            recall_window_start: Date | null;
            recall_status: string | null;
            recall_snoozed_until: Date | null;
            recall_last_contacted_at: Date | null;
            churn_window_start: Date | null;
            churn_status: string | null;
            churn_snoozed_until: Date | null;
            churn_last_contacted_at: Date | null;
            churn_retry_after: Date | null;
            recall_booked_after_outreach_at: Date | null;
            recall_booked_appointment_id: string | null;
            churn_booked_after_outreach_at: Date | null;
            churn_booked_appointment_id: string | null;
            no_show_attended_at: Date | null;
            no_show_attended_appointment_id: string | null;
        })[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getEligibleCount(clinicId: string, type: 'recall' | 'churn', branchId?: string): Promise<{
        type: "recall" | "churn";
        eligible: number;
        list_total: number;
        cooldown_days: number;
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
        recall_window_start: Date | null;
        recall_status: string | null;
        recall_snoozed_until: Date | null;
        recall_last_contacted_at: Date | null;
        churn_window_start: Date | null;
        churn_status: string | null;
        churn_snoozed_until: Date | null;
        churn_last_contacted_at: Date | null;
        churn_retry_after: Date | null;
        recall_booked_after_outreach_at: Date | null;
        recall_booked_appointment_id: string | null;
        churn_booked_after_outreach_at: Date | null;
        churn_booked_appointment_id: string | null;
        no_show_attended_at: Date | null;
        no_show_attended_appointment_id: string | null;
    }>;
    debugRecallVisibility(clinicId: string, branchId?: string, patientId?: string): Promise<{
        branch_filter: string | null;
        summary_recall_count: number;
        recall_due_raw_count: number;
        last_computed_at: Date | null;
        message: string;
        patient: {
            visible_on_list: boolean;
            visible_on_badge: boolean;
            exclusion_reasons: string[];
            patient_id: string;
            name: string | null;
            recall_due: boolean;
            recall_due_days: number | null;
            recall_status: string | null;
            churn_risk: string;
            churn_factors: import("@prisma/client/runtime/client").JsonValue;
            computed_at: Date;
        } | null;
        patients_with_recall_due: never[];
        hint?: undefined;
    } | {
        branch_filter: string | null;
        summary_recall_count: number;
        recall_due_raw_count: number;
        last_computed_at: Date | null;
        hint: string | null;
        patients_with_recall_due: {
            visible_on_list: boolean;
            visible_on_badge: boolean;
            exclusion_reasons: string[];
            patient_id: string;
            name: string | null;
            recall_due_days: number | null;
            recall_status: string | null;
            churn_risk: string;
            churn_factors: import("@prisma/client/runtime/client").JsonValue;
            score_branch_id: string;
            patient_branch_id: string;
            computed_at: Date;
        }[];
        message?: undefined;
        patient?: undefined;
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
    getClinicAvgVisitValue(clinicId: string, branchId?: string): Promise<number>;
    private countUniqueAtRiskPatients;
    getOpportunitySummary(clinicId: string, branchId?: string): Promise<{
        clinic_avg_visit_value: number;
        recall: {
            count: number;
            value: number;
        };
        no_show: {
            count: number;
            value: number;
        };
        inactive: {
            count: number;
            value: number;
        };
        total_opportunity: number;
        total_patients: number;
    }>;
    getRecoveredSummary(clinicId: string, branchId?: string): Promise<RecoveredSummaryResult>;
    recordAction(clinicId: string, patientId: string, dto: RecordActionDto, userId?: string): Promise<{
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
        recall_window_start: Date | null;
        recall_status: string | null;
        recall_snoozed_until: Date | null;
        recall_last_contacted_at: Date | null;
        churn_window_start: Date | null;
        churn_status: string | null;
        churn_snoozed_until: Date | null;
        churn_last_contacted_at: Date | null;
        churn_retry_after: Date | null;
        recall_booked_after_outreach_at: Date | null;
        recall_booked_appointment_id: string | null;
        churn_booked_after_outreach_at: Date | null;
        churn_booked_appointment_id: string | null;
        no_show_attended_at: Date | null;
        no_show_attended_appointment_id: string | null;
    }>;
}
