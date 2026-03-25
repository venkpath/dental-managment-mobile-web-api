import { ReportsService } from './reports.service.js';
import { RevenueQueryDto, AppointmentAnalyticsQueryDto, DentistPerformanceQueryDto, PatientAnalyticsQueryDto, TreatmentAnalyticsQueryDto } from './dto/index.js';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboardSummary(clinicId: string): Promise<import("./reports.service.js").DashboardSummary>;
    getRevenueReport(clinicId: string, query: RevenueQueryDto): Promise<import("./reports.service.js").RevenueReport>;
    getAppointmentAnalytics(clinicId: string, query: AppointmentAnalyticsQueryDto): Promise<import("./reports.service.js").AppointmentAnalytics>;
    getDentistPerformance(clinicId: string, query: DentistPerformanceQueryDto): Promise<import("./reports.service.js").DentistPerformanceItem[]>;
    getPatientAnalytics(clinicId: string, query: PatientAnalyticsQueryDto): Promise<import("./reports.service.js").PatientAnalytics>;
    getTreatmentAnalytics(clinicId: string, query: TreatmentAnalyticsQueryDto): Promise<import("./reports.service.js").TreatmentAnalytics>;
    getInventoryAlerts(clinicId: string, branchId?: string): Promise<import("./reports.service.js").InventoryAlertItem[]>;
}
