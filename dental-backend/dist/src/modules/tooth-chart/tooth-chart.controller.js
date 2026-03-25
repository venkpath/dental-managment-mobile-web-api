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
exports.ToothChartController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tooth_chart_service_js_1 = require("./tooth-chart.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
let ToothChartController = class ToothChartController {
    toothChartService;
    constructor(toothChartService) {
        this.toothChartService = toothChartService;
    }
    async getTeeth() {
        return this.toothChartService.getTeeth();
    }
    async getSurfaces() {
        return this.toothChartService.getSurfaces();
    }
    async getPatientToothChart(clinicId, patientId) {
        return this.toothChartService.getPatientToothChart(clinicId, patientId);
    }
    async createCondition(clinicId, dto) {
        return this.toothChartService.createCondition(clinicId, dto);
    }
    async updateCondition(clinicId, id, dto) {
        return this.toothChartService.updateCondition(clinicId, id, dto);
    }
};
exports.ToothChartController = ToothChartController;
__decorate([
    (0, common_1.Get)('teeth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all teeth (FDI reference data)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of 32 teeth' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ToothChartController.prototype, "getTeeth", null);
__decorate([
    (0, common_1.Get)('tooth-surfaces'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all tooth surfaces (reference data)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of tooth surfaces' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ToothChartController.prototype, "getSurfaces", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/tooth-chart'),
    (0, swagger_1.ApiOperation)({ summary: 'Get full tooth chart for a patient' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Patient tooth chart with teeth, surfaces, and conditions' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Patient not found in this clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ToothChartController.prototype, "getPatientToothChart", null);
__decorate([
    (0, common_1.Post)('patient-tooth-condition'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a tooth condition for a patient' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Tooth condition created successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Branch, patient, tooth, surface, or dentist not found' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateToothConditionDto]),
    __metadata("design:returntype", Promise)
], ToothChartController.prototype, "createCondition", null);
__decorate([
    (0, common_1.Patch)('patient-tooth-condition/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a tooth condition' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Tooth condition updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Tooth condition not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateToothConditionDto]),
    __metadata("design:returntype", Promise)
], ToothChartController.prototype, "updateCondition", null);
exports.ToothChartController = ToothChartController = __decorate([
    (0, swagger_1.ApiTags)('Tooth Chart'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [tooth_chart_service_js_1.ToothChartService])
], ToothChartController);
//# sourceMappingURL=tooth-chart.controller.js.map