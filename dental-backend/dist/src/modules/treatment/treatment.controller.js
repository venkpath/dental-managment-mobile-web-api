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
exports.TreatmentController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const treatment_service_js_1 = require("./treatment.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const dentist_scope_util_js_1 = require("../../common/utils/dentist-scope.util.js");
let TreatmentController = class TreatmentController {
    treatmentService;
    constructor(treatmentService) {
        this.treatmentService = treatmentService;
    }
    async create(clinicId, dto) {
        return this.treatmentService.create(clinicId, dto);
    }
    async findAll(clinicId, user, query) {
        (0, dentist_scope_util_js_1.applyDentistScope)(query, user);
        return this.treatmentService.findAll(clinicId, query);
    }
    async findByPatient(clinicId, patientId) {
        return this.treatmentService.findByPatient(clinicId, patientId);
    }
    async findOne(clinicId, id) {
        return this.treatmentService.findOne(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.treatmentService.update(clinicId, id, dto);
    }
};
exports.TreatmentController = TreatmentController;
__decorate([
    (0, common_1.Post)('treatments'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new treatment record' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Treatment created successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateTreatmentDto]),
    __metadata("design:returntype", Promise)
], TreatmentController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('treatments'),
    (0, swagger_1.ApiOperation)({ summary: 'List treatments with optional filters' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of treatments' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, index_js_1.QueryTreatmentDto]),
    __metadata("design:returntype", Promise)
], TreatmentController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/treatments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dental chart – all treatments for a patient' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of treatments for the patient' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Patient not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TreatmentController.prototype, "findByPatient", null);
__decorate([
    (0, common_1.Get)('treatments/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a treatment by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Treatment found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Treatment not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TreatmentController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('treatments/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update treatment details or status' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Treatment updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Treatment not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateTreatmentDto]),
    __metadata("design:returntype", Promise)
], TreatmentController.prototype, "update", null);
exports.TreatmentController = TreatmentController = __decorate([
    (0, swagger_1.ApiTags)('Treatments'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [treatment_service_js_1.TreatmentService])
], TreatmentController);
//# sourceMappingURL=treatment.controller.js.map