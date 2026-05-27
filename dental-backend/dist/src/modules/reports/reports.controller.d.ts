import { ReportsService } from './reports.service.js';
import { RevenueQueryDto, AppointmentAnalyticsQueryDto, DentistPerformanceQueryDto, PatientAnalyticsQueryDto, TreatmentAnalyticsQueryDto } from './dto/index.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboardSummary(clinicId: string, user: JwtPayload, branchId?: string): Promise<import("./reports.service.js").DashboardSummary>;
    getDashboardBootstrap(clinicId: string, user: JwtPayload, branchId?: string, daysParam?: string): Promise<{
        summary: import("./reports.service.js").DashboardSummary;
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
                    prescription_template_config: import("@prisma/client/runtime/client").JsonValue | null;
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
                    education: import("@prisma/client/runtime/client").JsonValue | null;
                    specializations: import("@prisma/client/runtime/client").JsonValue | null;
                    consultation_fee: import("@prisma/client-runtime-utils").Decimal | null;
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
                    medical_history: import("@prisma/client/runtime/client").JsonValue | null;
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
    getDashboardSparklines(clinicId: string, user: JwtPayload, branchId?: string, daysParam?: string): Promise<{
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
    getTodayPaymentBreakdown(clinicId: string, user: JwtPayload, branchId?: string): Promise<{
        cash: number;
        card: number;
        upi: number;
        other: number;
        total: number;
    }>;
    getRevenueReport(clinicId: string, user: JwtPayload, query: RevenueQueryDto): Promise<import("./reports.service.js").RevenueReport>;
    getAppointmentAnalytics(clinicId: string, user: JwtPayload, query: AppointmentAnalyticsQueryDto): Promise<import("./reports.service.js").AppointmentAnalytics>;
    getDentistPerformance(clinicId: string, user: JwtPayload, query: DentistPerformanceQueryDto): Promise<import("./reports.service.js").DentistPerformanceItem[]>;
    getPatientAnalytics(clinicId: string, query: PatientAnalyticsQueryDto): Promise<import("./reports.service.js").PatientAnalytics>;
    getTreatmentAnalytics(clinicId: string, user: JwtPayload, query: TreatmentAnalyticsQueryDto): Promise<import("./reports.service.js").TreatmentAnalytics>;
    getInventoryAlerts(clinicId: string, branchId?: string): Promise<import("./reports.service.js").InventoryAlertItem[]>;
    getProfitLoss(clinicId: string, user: JwtPayload, query: RevenueQueryDto): Promise<{
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
    getProfitLossMonthly(clinicId: string, user: JwtPayload, query: RevenueQueryDto): Promise<{
        month: string;
        revenue: number;
        expenses: number;
        net_profit: number;
        profit_margin: number;
    }[]>;
}
