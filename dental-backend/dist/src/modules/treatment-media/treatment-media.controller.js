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
exports.TreatmentMediaController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_1 = require("@nestjs/jwt");
const treatment_media_service_js_1 = require("./treatment-media.service.js");
const upload_treatment_media_dto_js_1 = require("./dto/upload-treatment-media.dto.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
let TreatmentMediaController = class TreatmentMediaController {
    treatmentMediaService;
    jwtService;
    constructor(treatmentMediaService, jwtService) {
        this.treatmentMediaService = treatmentMediaService;
        this.jwtService = jwtService;
    }
    async upload(clinicId, treatmentId, req, file, dto) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        return this.treatmentMediaService.upload(clinicId, {
            treatmentId,
            branchId: dto.branch_id,
            uploadedBy: req.user.userId,
            mediaType: dto.media_type,
            visitDate: dto.visit_date,
            caption: dto.caption,
            file,
        });
    }
    async findByTreatment(clinicId, treatmentId) {
        return this.treatmentMediaService.findByTreatment(clinicId, treatmentId);
    }
    async findByPatient(clinicId, patientId) {
        return this.treatmentMediaService.findByPatient(clinicId, patientId);
    }
    async serveFile(id, token, clinicId, res) {
        if (!token || !clinicId)
            throw new common_1.UnauthorizedException('Missing authentication');
        try {
            const payload = this.jwtService.verify(token);
            if (payload.clinic_id !== clinicId)
                throw new common_1.UnauthorizedException('Clinic mismatch');
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        const signedUrl = await this.treatmentMediaService.getSignedUrl(clinicId, id);
        res.redirect(302, signedUrl);
    }
    async remove(clinicId, id) {
        return this.treatmentMediaService.remove(clinicId, id);
    }
};
exports.TreatmentMediaController = TreatmentMediaController;
__decorate([
    (0, common_1.Post)('treatments/:treatmentId/media/upload'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a photo, X-ray, report, or document for a treatment' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Media uploaded and compressed to S3' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 20 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('treatmentId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.UploadedFile)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, upload_treatment_media_dto_js_1.UploadTreatmentMediaDto]),
    __metadata("design:returntype", Promise)
], TreatmentMediaController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('treatments/:treatmentId/media'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, swagger_1.ApiOperation)({ summary: 'List all media for a treatment, ordered by visit date' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Treatment media list' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('treatmentId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TreatmentMediaController.prototype, "findByTreatment", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/treatment-media'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, swagger_1.ApiOperation)({ summary: 'List all treatment media for a patient across all treatments' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Patient treatment media list' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TreatmentMediaController.prototype, "findByPatient", null);
__decorate([
    (0, common_1.Get)('treatment-media/:id/file'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Redirect to a presigned S3 URL for the treatment media file' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('token')),
    __param(2, (0, common_1.Query)('clinic_id')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], TreatmentMediaController.prototype, "serveFile", null);
__decorate([
    (0, common_1.Delete)('treatment-media/:id'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a treatment media record and file from S3' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TreatmentMediaController.prototype, "remove", null);
exports.TreatmentMediaController = TreatmentMediaController = __decorate([
    (0, swagger_1.ApiTags)('Treatment Media'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [treatment_media_service_js_1.TreatmentMediaService,
        jwt_1.JwtService])
], TreatmentMediaController);
//# sourceMappingURL=treatment-media.controller.js.map