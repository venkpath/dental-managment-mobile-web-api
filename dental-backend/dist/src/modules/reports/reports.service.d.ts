import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { RevenueQueryDto, AppointmentAnalyticsQueryDto, DentistPerformanceQueryDto, PatientAnalyticsQueryDto, TreatmentAnalyticsQueryDto } from './dto/index.js';
export interface DashboardSummary {
    today_appointments: number;
    today_revenue: number;
    pending_invoices: number;
    outstanding_amount: number;
    low_inventory_count: number;
    this_month_expenses: number;
    this_month_revenue: number;
    this_month_refunds: number;
    net_profit: number;
    new_patients_this_month: number;
}
export interface AppointmentAnalytics {
    total_appointments: number;
    completed: number;
    cancelled: number;
    no_show: number;
}
export interface DentistPerformanceItem {
    dentist_id: string;
    dentist_name: string;
    appointments_handled: number;
    treatments_performed: number;
    revenue_generated: number;
}
export interface PatientAnalytics {
    new_patients: number;
    returning_patients: number;
    total_patients: number;
}
export interface ProcedureCount {
    procedure: string;
    count: number;
}
export interface TreatmentAnalytics {
    most_common_procedures: ProcedureCount[];
    procedure_counts: number;
}
export interface InventoryAlertItem {
    id: string;
    name: string;
    category: string | null;
    quantity: number;
    reorder_level: number;
    unit: string;
    branch_id: string;
}
export interface RevenueReport {
    total_revenue: number;
    paid_invoices: number;
    pending_invoices: number;
    partially_paid_invoices: number;
    outstanding_amount: number;
    tax_collected: number;
    discount_given: number;
}
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private readonly _summaryCache;
    getDashboardSummary(clinicId: string, branchId?: string, dentistId?: string, referenceDate?: Date): Promise<DashboardSummary>;
    getDashboardBootstrap(clinicId: string, branchId?: string, dentistId?: string, days?: number): Promise<{
        summary: DashboardSummary;
        sparklines: {
            daily: Array<{
                date: string;
                revenue: number;
                appointments: number;
                expenses: number;
            }>;
            trends: {
                today_revenue_vs_yesterday: number | null;
                today_appointments_vs_yesterday: number | null;
                outstanding_vs_last_month: number | null;
                month_revenue_vs_last_month: number | null;
                month_expenses_vs_last_month: number | null;
                net_profit_vs_last_month: number | null;
            };
        };
        today_appointments: {
            data: ({
                branch: {
                    id: string;
                    name: string;
                    created_at: Date;
                    updated_at: Date;
                    phone: string | null;
                    address: string | null;
                    city: string | null;
                    state: string | null;
                    country: string | null;
                    pincode: string | null;
                    latitude: number | null;
                    longitude: number | null;
                    map_url: string | null;
                    photo_url: string | null;
                    book_now_url: string | null;
                    working_start_time: string | null;
                    working_end_time: string | null;
                    lunch_start_time: string | null;
                    lunch_end_time: string | null;
                    slot_duration: number | null;
                    default_appt_duration: number | null;
                    buffer_minutes: number | null;
                    advance_booking_days: number | null;
                    working_days: string | null;
                    room_cleaning_duration_minutes: number | null;
                    prescription_template_url: string | null;
                    prescription_template_config: Prisma.JsonValue | null;
                    prescription_template_enabled: boolean;
                    qr_code_token: string | null;
                    qr_code_enabled: boolean;
                    qr_code_generated_at: Date | null;
                    display_token: string | null;
                    display_token_enabled: boolean;
                    clinic_id: string;
                };
                dentist: {
                    id: string;
                    email: string;
                    password_hash: string;
                    name: string;
                    status: string;
                    created_at: Date;
                    updated_at: Date;
                    phone: string | null;
                    listed_in_directory: boolean;
                    languages_spoken: string | null;
                    clinic_id: string;
                    role: string;
                    email_verified: boolean;
                    phone_verified: boolean;
                    is_doctor: boolean;
                    license_number: string | null;
                    signature_url: string | null;
                    profile_photo_url: string | null;
                    bio: string | null;
                    years_experience: number | null;
                    education: Prisma.JsonValue | null;
                    specializations: Prisma.JsonValue | null;
                    consultation_fee: Prisma.Decimal | null;
                    branch_id: string | null;
                };
                patient: {
                    id: string;
                    email: string | null;
                    created_at: Date;
                    updated_at: Date;
                    phone: string;
                    clinic_id: string;
                    profile_photo_url: string | null;
                    branch_id: string;
                    category: string | null;
                    notes: string | null;
                    age: number | null;
                    gender: string;
                    first_name: string;
                    last_name: string;
                    date_of_birth: Date | null;
                    blood_group: string | null;
                    medical_history: Prisma.JsonValue | null;
                    allergies: string | null;
                    preferred_language: string;
                };
            } & {
                id: string;
                status: string;
                created_at: Date;
                updated_at: Date;
                clinic_id: string;
                branch_id: string;
                appointment_date: Date;
                notes: string | null;
                patient_id: string;
                start_time: string;
                end_time: string;
                dentist_id: string;
                recurrence_group_id: string | null;
                room_id: string | null;
            })[];
            meta: {
                total: number;
                page: number;
                limit: number;
                totalPages: number;
            };
        };
    }>;
    getTodayPaymentBreakdown(clinicId: string, branchId?: string, dentistId?: string): Promise<{
        cash: number;
        card: number;
        upi: number;
        other: number;
        total: number;
        clinic_date: string;
        payments: Array<{
            invoice_number: string;
            method: string;
            amount: number;
            paid_at: string;
        }>;
    }>;
    getDashboardSparklines(clinicId: string, branchId?: string, dentistId?: string, days?: number): Promise<{
        daily: Array<{
            date: string;
            revenue: number;
            appointments: number;
            expenses: number;
        }>;
        trends: {
            today_revenue_vs_yesterday: number | null;
            today_appointments_vs_yesterday: number | null;
            outstanding_vs_last_month: number | null;
            month_revenue_vs_last_month: number | null;
            month_expenses_vs_last_month: number | null;
            net_profit_vs_last_month: number | null;
        };
    }>;
    getRevenueReport(clinicId: string, query: RevenueQueryDto): Promise<RevenueReport>;
    getAppointmentAnalytics(clinicId: string, query: AppointmentAnalyticsQueryDto): Promise<AppointmentAnalytics>;
    getDentistPerformance(clinicId: string, query: DentistPerformanceQueryDto): Promise<DentistPerformanceItem[]>;
    getPatientAnalytics(clinicId: string, query: PatientAnalyticsQueryDto): Promise<PatientAnalytics>;
    getTreatmentAnalytics(clinicId: string, query: TreatmentAnalyticsQueryDto): Promise<TreatmentAnalytics>;
    getInventoryAlerts(clinicId: string, branchId?: string): Promise<InventoryAlertItem[]>;
    getProfitLoss(clinicId: string, query: RevenueQueryDto): Promise<{
        total_revenue: number;
        total_expenses: number;
        net_profit: number;
        profit_margin: number;
        expense_count: number;
        expense_breakdown: {
            category_id: string;
            category_name: string;
            category_icon: string | null;
            total: number;
        }[];
    }>;
    getProfitLossMonthly(clinicId: string, query: RevenueQueryDto): Promise<{
        month: string;
        revenue: number;
        expenses: number;
        net_profit: number;
        profit_margin: number;
    }[]>;
}
