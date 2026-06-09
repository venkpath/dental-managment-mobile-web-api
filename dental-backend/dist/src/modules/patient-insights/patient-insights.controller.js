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
exports.PatientInsightsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const patient_insights_service_js_1 = require("./patient-insights.service.js");
const query_insights_dto_js_1 = require("./dto/query-insights.dto.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
let PatientInsightsController = class PatientInsightsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async compute(clinicId, dto) {
        return this.service.computeForClinic(clinicId, dto.branch_id, 'manual');
    }
    async getSummary(clinicId, branchId) {
        return this.service.getSummary(clinicId, branchId);
    }
    async getList(clinicId, dto) {
        return this.service.getList(clinicId, dto);
    }
    async getEligible(clinicId, type, branchId) {
        if (type !== 'recall' && type !== 'churn') {
            throw new common_1.BadRequestException('Query param "type" must be recall or churn');
        }
        return this.service.getEligibleCount(clinicId, type, branchId);
    }
    async getOpportunitySummary(clinicId, branchId) {
        return this.service.getOpportunitySummary(clinicId, branchId);
    }
    async getRecoveredSummary(clinicId, branchId) {
        return this.service.getRecoveredSummary(clinicId, branchId);
    }
    async getLatestBatch(clinicId) {
        return this.service.getLatestBatch(clinicId);
    }
    async getBatchStatus(clinicId, batchId) {
        return this.service.getBatchStatus(batchId, clinicId);
    }
    async debugRecall(clinicId, branchId, patientId) {
        return this.service.debugRecallVisibility(clinicId, branchId, patientId);
    }
    async getPatientScore(clinicId, patientId) {
        return this.service.getPatientScore(clinicId, patientId);
    }
    async recordAction(clinicId, patientId, dto, user) {
        return this.service.recordAction(clinicId, patientId, dto, user?.sub);
    }
};
exports.PatientInsightsController = PatientInsightsController;
__decorate([
    (0, common_1.Post)('compute'),
    (0, common_1.HttpCode)(202),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_PATIENT_INSIGHTS'),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger insight computation for all patients in clinic/branch' }),
    openapi.ApiResponse({ status: 202 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_insights_dto_js_1.ComputeInsightsDto]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "compute", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get aggregated insight counts for dashboard' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Summary with counts per insight type' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('list'),
    (0, swagger_1.ApiOperation)({ summary: 'Get paginated patient list for an insight type' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_insights_dto_js_1.QueryInsightsDto]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "getList", null);
__decorate([
    (0, common_1.Get)('eligible'),
    (0, swagger_1.ApiOperation)({ summary: 'Count patients eligible for campaign outreach (list rules + cooldown)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "getEligible", null);
__decorate([
    (0, common_1.Get)('opportunity'),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_PATIENT_INSIGHTS'),
    (0, swagger_1.ApiOperation)({ summary: 'Get potential revenue opportunity from at-risk patients' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "getOpportunitySummary", null);
__decorate([
    (0, common_1.Get)('recovered'),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_PATIENT_INSIGHTS'),
    (0, swagger_1.ApiOperation)({ summary: 'Get revenue recovered from at-risk patients who returned (last 90 days)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "getRecoveredSummary", null);
__decorate([
    (0, common_1.Get)('batch/latest'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest computation batch status' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "getLatestBatch", null);
__decorate([
    (0, common_1.Get)('batch/:batchId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get computation batch status by ID' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('batchId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "getBatchStatus", null);
__decorate([
    (0, common_1.Get)('debug/recall'),
    (0, swagger_1.ApiOperation)({
        summary: 'Debug recall list vs badge mismatch (why summary count is 0)',
    }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('branch_id')),
    __param(2, (0, common_1.Query)('patient_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "debugRecall", null);
__decorate([
    (0, common_1.Get)('patient/:patientId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get insight scores for a single patient' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "getPatientScore", null);
__decorate([
    (0, common_1.Patch)('patient/:patientId/action'),
    (0, common_1.HttpCode)(200),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_PATIENT_INSIGHTS'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a staff action (contacted / snooze / move_inactive / decline) on a patient insight' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, query_insights_dto_js_1.RecordActionDto, Object]),
    __metadata("design:returntype", Promise)
], PatientInsightsController.prototype, "recordAction", null);
exports.PatientInsightsController = PatientInsightsController = __decorate([
    (0, swagger_1.ApiTags)('Patient Insights'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, throttler_1.SkipThrottle)({ strict: true }),
    (0, common_1.Controller)('patient-insights'),
    __metadata("design:paramtypes", [patient_insights_service_js_1.PatientInsightsService])
], PatientInsightsController);
//# sourceMappingURL=patient-insights.controller.js.map