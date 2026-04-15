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
exports.ClinicalVisitController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const clinical_visit_service_js_1 = require("./clinical-visit.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
let ClinicalVisitController = class ClinicalVisitController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(clinicId, dto) {
        return this.service.create(clinicId, dto);
    }
    findAll(clinicId, query) {
        return this.service.findAll(clinicId, query);
    }
    findByPatient(clinicId, patientId) {
        return this.service.findByPatient(clinicId, patientId);
    }
    findOne(clinicId, id) {
        return this.service.findOne(clinicId, id);
    }
    update(clinicId, id, dto) {
        return this.service.update(clinicId, id, dto);
    }
    finalize(clinicId, id) {
        return this.service.finalize(clinicId, id);
    }
    cancel(clinicId, id) {
        return this.service.cancel(clinicId, id);
    }
    createPlan(clinicId, dto) {
        return this.service.createPlan(clinicId, dto);
    }
    findPlansByPatient(clinicId, patientId) {
        return this.service.findPlansByPatient(clinicId, patientId);
    }
    findOnePlan(clinicId, id) {
        return this.service.findOnePlan(clinicId, id);
    }
    updatePlan(clinicId, id, dto) {
        return this.service.updatePlan(clinicId, id, dto);
    }
    acceptPlan(clinicId, id) {
        return this.service.acceptPlan(clinicId, id);
    }
    deletePlan(clinicId, id) {
        return this.service.deletePlan(clinicId, id);
    }
};
exports.ClinicalVisitController = ClinicalVisitController;
__decorate([
    (0, common_1.Post)('clinical-visits'),
    (0, swagger_1.ApiOperation)({ summary: 'Start a new clinical visit (consultation)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Visit created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateClinicalVisitDto]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('clinical-visits'),
    (0, swagger_1.ApiOperation)({ summary: 'List clinical visits' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of clinical visits' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.QueryClinicalVisitDto]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/clinical-visits'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all clinical visits for a patient (chronological history)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "findByPatient", null);
__decorate([
    (0, common_1.Get)('clinical-visits/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get visit detail (with findings, plans, treatments)' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Visit not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('clinical-visits/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update visit (chief complaint, exam notes, SOAP, etc.)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateClinicalVisitDto]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('clinical-visits/:id/finalize'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Finalize the visit — locks the clinical record' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)('clinical-visits/:id/cancel'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel the visit' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('treatment-plans'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a treatment plan (optionally tied to a clinical visit)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Treatment plan created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateTreatmentPlanDto]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/treatment-plans'),
    (0, swagger_1.ApiOperation)({ summary: 'List treatment plans for a patient' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "findPlansByPatient", null);
__decorate([
    (0, common_1.Get)('treatment-plans/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get treatment plan detail (with items & treatments)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "findOnePlan", null);
__decorate([
    (0, common_1.Patch)('treatment-plans/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update plan title, notes, or status' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateTreatmentPlanDto]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Post)('treatment-plans/:id/accept'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({
        summary: 'Accept the plan — creates Treatment records for each item',
        description: 'Converts every proposed item into a planned Treatment and marks the plan as accepted.',
    }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "acceptPlan", null);
__decorate([
    (0, common_1.Delete)('treatment-plans/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a treatment plan' }),
    (0, common_1.HttpCode)(204),
    openapi.ApiResponse({ status: 204 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ClinicalVisitController.prototype, "deletePlan", null);
exports.ClinicalVisitController = ClinicalVisitController = __decorate([
    (0, swagger_1.ApiTags)('Clinical Visits'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [clinical_visit_service_js_1.ClinicalVisitService])
], ClinicalVisitController);
//# sourceMappingURL=clinical-visit.controller.js.map