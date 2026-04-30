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
exports.PrescriptionController = exports.PrescriptionPublicController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const prescription_service_js_1 = require("./prescription.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const dentist_scope_util_js_1 = require("../../common/utils/dentist-scope.util.js");
let PrescriptionPublicController = class PrescriptionPublicController {
    prescriptionService;
    constructor(prescriptionService) {
        this.prescriptionService = prescriptionService;
    }
    async prescriptionRedirect(id, clinicId) {
        const { url } = await this.prescriptionService.getPdfUrl(clinicId, id, { withBackground: true });
        return { url, statusCode: 302 };
    }
};
exports.PrescriptionPublicController = PrescriptionPublicController;
__decorate([
    (0, common_1.Get)('public/prescription-redirect/:id'),
    (0, common_1.Redirect)(),
    (0, swagger_1.ApiOperation)({ summary: 'Redirect WhatsApp link to a fresh S3 signed prescription PDF URL' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('clinic')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PrescriptionPublicController.prototype, "prescriptionRedirect", null);
exports.PrescriptionPublicController = PrescriptionPublicController = __decorate([
    (0, swagger_1.ApiTags)('Prescriptions'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prescription_service_js_1.PrescriptionService])
], PrescriptionPublicController);
let PrescriptionController = class PrescriptionController {
    prescriptionService;
    constructor(prescriptionService) {
        this.prescriptionService = prescriptionService;
    }
    async findAll(clinicId, user, query) {
        (0, dentist_scope_util_js_1.applyDentistScope)(query, user);
        return this.prescriptionService.findAll(clinicId, query);
    }
    async create(clinicId, dto) {
        return this.prescriptionService.create(clinicId, dto);
    }
    async findOne(clinicId, id) {
        return this.prescriptionService.findOne(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.prescriptionService.update(clinicId, id, dto);
    }
    async getPdfUrl(clinicId, id, bg) {
        const withBackground = bg !== '0' && bg !== 'false';
        return this.prescriptionService.getPdfUrl(clinicId, id, { withBackground });
    }
    async sendWhatsApp(clinicId, id) {
        return this.prescriptionService.sendWhatsApp(clinicId, id);
    }
    async findByPatient(clinicId, patientId) {
        return this.prescriptionService.findByPatient(clinicId, patientId);
    }
};
exports.PrescriptionController = PrescriptionController;
__decorate([
    (0, common_1.Get)('prescriptions'),
    (0, swagger_1.ApiOperation)({ summary: 'List all prescriptions with pagination and filters' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Paginated list of prescriptions' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, index_js_1.QueryPrescriptionDto]),
    __metadata("design:returntype", Promise)
], PrescriptionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('prescriptions'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new prescription with medicine items' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Prescription created successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreatePrescriptionDto]),
    __metadata("design:returntype", Promise)
], PrescriptionController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('prescriptions/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a prescription by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Prescription found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Prescription not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PrescriptionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('prescriptions/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a prescription (diagnosis, instructions, or medicine items)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Prescription updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Prescription not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdatePrescriptionDto]),
    __metadata("design:returntype", Promise)
], PrescriptionController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('prescriptions/:id/pdf'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate prescription PDF and return a signed S3 URL',
        description: 'Pass `bg=0` to render text-only output for printing on a clinic\'s pre-printed physical notepad (no letterhead overlay). Default is `bg=1` (digital, with letterhead). Only affects branches with a custom template configured.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Signed URL to prescription PDF' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('bg')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PrescriptionController.prototype, "getPdfUrl", null);
__decorate([
    (0, common_1.Post)('prescriptions/:id/send-whatsapp'),
    (0, swagger_1.ApiOperation)({ summary: 'Send prescription PDF link to patient via WhatsApp' }),
    (0, swagger_1.ApiOkResponse)({ description: 'WhatsApp message sent' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PrescriptionController.prototype, "sendWhatsApp", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/prescriptions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all prescriptions for a patient' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of prescriptions for the patient' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Patient not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PrescriptionController.prototype, "findByPatient", null);
exports.PrescriptionController = PrescriptionController = __decorate([
    (0, swagger_1.ApiTags)('Prescriptions'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prescription_service_js_1.PrescriptionService])
], PrescriptionController);
//# sourceMappingURL=prescription.controller.js.map