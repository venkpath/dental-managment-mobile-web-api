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
exports.PatientInsuranceController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const current_clinic_decorator_js_1 = require("../../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../../common/guards/require-clinic.guard.js");
const require_feature_decorator_js_1 = require("../../../common/decorators/require-feature.decorator.js");
const create_patient_insurance_dto_js_1 = require("../dto/create-patient-insurance.dto.js");
const update_patient_insurance_dto_js_1 = require("../dto/update-patient-insurance.dto.js");
const patient_insurance_service_js_1 = require("../services/patient-insurance.service.js");
const insurance_file_service_js_1 = require("../services/insurance-file.service.js");
const VALID_SLOTS = ['card_front', 'card_back', 'referral_letter'];
let PatientInsuranceController = class PatientInsuranceController {
    enrollments;
    files;
    constructor(enrollments, files) {
        this.enrollments = enrollments;
        this.files = files;
    }
    async listAll(clinicId, search, provider_id, is_active, skip, take) {
        return this.enrollments.listAll(clinicId, {
            search: search || undefined,
            provider_id: provider_id || undefined,
            is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
        });
    }
    async list(clinicId, patientId) {
        return this.enrollments.list(clinicId, patientId);
    }
    async create(clinicId, patientId, dto) {
        return this.enrollments.create(clinicId, patientId, dto);
    }
    async get(clinicId, id) {
        return this.enrollments.get(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.enrollments.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.enrollments.remove(clinicId, id);
    }
    async upload(clinicId, id, slot, file) {
        if (!VALID_SLOTS.includes(slot)) {
            throw new common_1.BadRequestException(`Invalid slot. Must be one of: ${VALID_SLOTS.join(', ')}`);
        }
        return this.enrollments.uploadDocument(clinicId, id, slot, file);
    }
    async downloadToken(clinicId, id, slot) {
        if (!VALID_SLOTS.includes(slot)) {
            throw new common_1.BadRequestException(`Invalid slot. Must be one of: ${VALID_SLOTS.join(', ')}`);
        }
        const row = await this.enrollments.get(clinicId, id);
        const field = {
            card_front: 'card_front_url',
            card_back: 'card_back_url',
            referral_letter: 'referral_letter_url',
        }[slot];
        const filePath = row[field];
        if (!filePath)
            throw new common_1.BadRequestException('No file uploaded for that slot');
        const { token } = this.files.buildDownloadUrl({ clinicId, filePath });
        return { token, file_url: filePath };
    }
    async eligibility(clinicId, id) {
        return this.enrollments.checkEligibility(clinicId, id);
    }
    async coveragePreview(clinicId, id, body) {
        if (!body?.items?.length) {
            throw new common_1.BadRequestException('items array is required');
        }
        return this.enrollments.previewCoverage(clinicId, id, body.items);
    }
};
exports.PatientInsuranceController = PatientInsuranceController;
__decorate([
    (0, common_1.Get)('insurance/enrollments'),
    (0, swagger_1.ApiOperation)({ summary: 'Clinic-wide list of all patient insurance enrollments (Insurance Portal)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('provider_id')),
    __param(3, (0, common_1.Query)('is_active')),
    __param(4, (0, common_1.Query)('skip')),
    __param(5, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "listAll", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/insurances'),
    (0, swagger_1.ApiOperation)({ summary: 'List a patient\'s insurance / EHS enrollments' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('patients/:patientId/insurances'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new insurance / EHS enrollment for a patient' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_patient_insurance_dto_js_1.CreatePatientInsuranceDto]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('patient-insurances/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)('patient-insurances/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_patient_insurance_dto_js_1.UpdatePatientInsuranceDto]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('patient-insurances/:id'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('patient-insurances/:id/documents/:slot'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload card front / back / referral letter' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 15 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('slot')),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('patient-insurances/:id/download-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Mint a signed-token URL for downloading a patient document' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('slot')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "downloadToken", null);
__decorate([
    (0, common_1.Get)('patient-insurances/:id/eligibility'),
    (0, swagger_1.ApiOperation)({ summary: 'Eligibility check — used by the appointment + invoice banners' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "eligibility", null);
__decorate([
    (0, common_1.Post)('patient-insurances/:id/coverage-preview'),
    (0, swagger_1.ApiOperation)({
        summary: 'Compute per-line insurance vs patient breakdown for a set of invoice items',
        description: 'Pure read — used by the invoice form for live coverage preview before saving.',
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PatientInsuranceController.prototype, "coveragePreview", null);
exports.PatientInsuranceController = PatientInsuranceController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Patient Enrollment'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [patient_insurance_service_js_1.PatientInsuranceService,
        insurance_file_service_js_1.InsuranceFileService])
], PatientInsuranceController);
//# sourceMappingURL=patient-insurance.controller.js.map