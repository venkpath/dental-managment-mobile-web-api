import { ReportsService } from './reports.service.js';
import { RevenueQueryDto, AppointmentAnalyticsQueryDto, DentistPerformanceQueryDto, PatientAnalyticsQueryDto, TreatmentAnalyticsQueryDto } from './dto/index.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboardSummary(clinicId: string, user: JwtPayload, branchId?: string): Promise<import("./reports.service.js").DashboardSummary>;
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
