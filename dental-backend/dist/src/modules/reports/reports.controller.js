"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_js_1 = require("./reports.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async getDashboardSummary(clinicId, branchId) {
        return this.reportsService.getDashboardSummary(clinicId, branchId);
    }
    async getRevenueReport(clinicId, query) {
        return this.reportsService.getRevenueReport(clinicId, query);
    }
    async getAppointmentAnalytics(clinicId, query) {
        return this.reportsService.getAppointmentAnalytics(clinicId, query);
    }
    async getDentistPerformance(clinicId, query) {
        return this.reportsService.getDentistPerformance(clinicId, query);
    }
    async getPatientAnalytics(clinicId, query) {
        return this.reportsService.getPatientAnalytics(clinicId, query);
    }
    async getTreatmentAnalytics(clinicId, query) {
        return this.reportsService.getTreatmentAnalytics(clinicId, query);
    }
    async getInventoryAlerts(clinicId, branchId) {
        return this.reportsService.getInventoryAlerts(clinicId, branchId);
    }
    async getProfitLoss(clinicId, query) {
        return this.reportsService.getProfitLoss(clinicId, query);
    }
    async getProfitLossMonthly(clinicId, query) {
        return this.reportsService.getProfitLossMonthly(clinicId, query);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('dashboard-summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard summary metrics for the clinic' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Dashboard summary with today\'s metrics' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)('revenue'),
    (0, swagger_1.ApiOperation)({ summary: 'Get revenue report with date range and optional filters' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Revenue report with financial metrics' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.RevenueQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getRevenueReport", null);
__decorate([
    (0, common_1.Get)('appointments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get appointment analytics with status breakdown' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Appointment analytics with status counts' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.AppointmentAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getAppointmentAnalytics", null);
__decorate([
    (0, common_1.Get)('dentist-performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get performance metrics per dentist' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of dentists with their performance metrics' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.DentistPerformanceQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getDentistPerformance", null);
__decorate([
    (0, common_1.Get)('patients'),
    (0, swagger_1.ApiOperation)({ summary: 'Get patient analytics with new vs returning breakdown' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Patient analytics with registration and visit metrics' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.PatientAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getPatientAnalytics", null);
__decorate([
    (0, common_1.Get)('treatments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get treatment analytics with procedure breakdown' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Treatment analytics with most common procedures' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.TreatmentAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getTreatmentAnalytics", null);
__decorate([
    (0, common_1.Get)('inventory-alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get inventory items at or below reorder level' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of low-stock inventory items' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getInventoryAlerts", null);
__decorate([
    (0, common_1.Get)('profit-loss'),
    (0, swagger_1.ApiOperation)({ summary: 'Get profit & loss report (revenue vs expenses)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Profit & loss with expense breakdown by category' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.RevenueQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getProfitLoss", null);
__decorate([
    (0, common_1.Get)('profit-loss-monthly'),
    (0, swagger_1.ApiOperation)({ summary: 'Get monthly P&L breakdown for a date range' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Array of monthly P&L entries with revenue, expenses, net profit' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.RevenueQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getProfitLossMonthly", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('Reports'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_js_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map