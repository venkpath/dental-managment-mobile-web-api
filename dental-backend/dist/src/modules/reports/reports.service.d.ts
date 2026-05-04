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
    getDashboardSummary(clinicId: string, branchId?: string, dentistId?: string, referenceDate?: Date): Promise<DashboardSummary>;
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
