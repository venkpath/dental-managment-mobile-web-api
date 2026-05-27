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
exports.PatientController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const patient_service_js_1 = require("./patient.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const patient_import_producer_js_1 = require("./patient-import.producer.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
let PatientController = class PatientController {
    patientService;
    s3Service;
    importProducer;
    constructor(patientService, s3Service, importProducer) {
        this.patientService = patientService;
        this.s3Service = s3Service;
        this.importProducer = importProducer;
    }
    async create(clinicId, dto) {
        return this.patientService.create(clinicId, dto);
    }
    async findAll(clinicId, query) {
        return this.patientService.findAll(clinicId, query);
    }
    async findOne(clinicId, id) {
        return this.patientService.findOne(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.patientService.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.patientService.remove(clinicId, id);
    }
    async uploadProfilePhoto(clinicId, id, file) {
        return this.patientService.uploadProfilePhoto(clinicId, id, file);
    }
    async deleteProfilePhoto(clinicId, id) {
        return this.patientService.deleteProfilePhoto(clinicId, id);
    }
    async importFromFile(clinicId, file, branchId) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        if (!branchId)
            throw new common_1.BadRequestException('branch_id is required');
        const fileKey = `patient-imports/${clinicId}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        await this.s3Service.upload(fileKey, file.buffer, file.mimetype);
        const job = await this.patientService.createImportJob(clinicId, branchId, fileKey, file.mimetype);
        await this.importProducer.enqueue({ jobId: job.id, clinicId, branchId, fileKey, fileMime: file.mimetype });
        return { jobId: job.id };
    }
    async getImportJob(clinicId, jobId) {
        return this.patientService.getImportJob(clinicId, jobId);
    }
    async importBulk(clinicId, dto) {
        if (dto.patients.length === 0)
            throw new common_1.BadRequestException('No patients to import');
        if (dto.patients.length > 1000)
            throw new common_1.BadRequestException('Maximum 1000 patients per import');
        return this.patientService.bulkImport(clinicId, dto.branch_id, dto.patients);
    }
    async importFromImage(clinicId, file, branchId) {
        if (!file)
            throw new common_1.BadRequestException('No image uploaded');
        if (!branchId)
            throw new common_1.BadRequestException('branch_id is required');
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Invalid image type. Supported: JPEG, PNG, WebP, GIF');
        }
        return this.patientService.extractPatientsFromImage(clinicId, branchId, file.buffer, file.mimetype);
    }
};
exports.PatientController = PatientController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new patient' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Patient created successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreatePatientDto]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List patients with optional search filters' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of patients' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.QueryPatientDto]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a patient by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Patient found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Patient not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update patient details' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Patient updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Patient not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdatePatientDto]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a patient' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Patient deleted successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Patient not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/profile-photo'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a profile photo for the patient (private, served via presigned URL)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOkResponse)({ description: 'Profile photo uploaded' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 2 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "uploadProfilePhoto", null);
__decorate([
    (0, common_1.Delete)(':id/profile-photo'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove the profile photo for the patient' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Profile photo removed' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "deleteProfilePhoto", null);
__decorate([
    (0, common_1.Post)('import/file'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, require_feature_decorator_js_1.RequireFeature)('PATIENT_IMPORT'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload CSV/Excel and queue async import job. Returns jobId immediately.' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                branch_id: { type: 'string', format: 'uuid' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: common_1.HttpStatus.ACCEPTED }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "importFromFile", null);
__decorate([
    (0, common_1.Get)('import/jobs/:jobId'),
    (0, require_feature_decorator_js_1.RequireFeature)('PATIENT_IMPORT'),
    (0, swagger_1.ApiOperation)({ summary: 'Poll the status of a patient import job' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('jobId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "getImportJob", null);
__decorate([
    (0, common_1.Post)('import/bulk'),
    (0, require_feature_decorator_js_1.RequireFeature)('PATIENT_IMPORT'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk import patients from JSON array (after preview/edit)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.BulkImportDto]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "importBulk", null);
__decorate([
    (0, common_1.Post)('import/image'),
    (0, require_feature_decorator_js_1.RequireFeature)('PATIENT_IMPORT'),
    (0, swagger_1.ApiOperation)({ summary: 'Extract patient data from image using AI (handwritten notes, registers)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                branch_id: { type: 'string', format: 'uuid' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "importFromImage", null);
exports.PatientController = PatientController = __decorate([
    (0, swagger_1.ApiTags)('Patients'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('patients'),
    __metadata("design:paramtypes", [patient_service_js_1.PatientService,
        s3_service_js_1.S3Service,
        patient_import_producer_js_1.PatientImportProducer])
], PatientController);
//# sourceMappingURL=patient.controller.js.map