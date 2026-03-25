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
exports.AttachmentController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_1 = require("@nestjs/jwt");
const path_1 = require("path");
const fs_1 = require("fs");
const attachment_service_js_1 = require("./attachment.service.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/dicom',
];
let AttachmentController = class AttachmentController {
    attachmentService;
    jwtService;
    constructor(attachmentService, jwtService) {
        this.attachmentService = attachmentService;
        this.jwtService = jwtService;
    }
    async upload(clinicId, patientId, req, file, type, branchId) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Unsupported file type: ${file.mimetype}`);
        }
        if (!type || !['xray', 'report', 'document'].includes(type)) {
            throw new common_1.BadRequestException('type must be xray, report, or document');
        }
        return this.attachmentService.uploadFile(clinicId, {
            patientId,
            branchId,
            uploadedBy: req.user.userId,
            type,
            file,
        });
    }
    async findByPatient(clinicId, patientId) {
        return this.attachmentService.findByPatient(clinicId, patientId);
    }
    async serveFile(id, token, clinicId, res) {
        if (!token || !clinicId) {
            throw new common_1.UnauthorizedException('Missing authentication');
        }
        try {
            const payload = this.jwtService.verify(token);
            if (payload.clinic_id !== clinicId) {
                throw new common_1.UnauthorizedException('Clinic mismatch');
            }
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        const attachment = await this.attachmentService.findById(clinicId, id);
        const uploadsBase = (0, path_1.resolve)(process.cwd(), 'uploads');
        const filePath = (0, path_1.resolve)(process.cwd(), attachment.file_url);
        if (!filePath.startsWith(uploadsBase)) {
            throw new common_1.BadRequestException('Invalid file path');
        }
        if (!(0, fs_1.existsSync)(filePath)) {
            throw new common_1.NotFoundException('File not found on disk');
        }
        res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.sendFile(filePath);
    }
    async remove(clinicId, id) {
        return this.attachmentService.remove(clinicId, id);
    }
};
exports.AttachmentController = AttachmentController;
__decorate([
    (0, common_1.Post)('patients/:patientId/attachments/upload'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a file attachment for a patient' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Attachment uploaded successfully' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 15 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.UploadedFile)()),
    __param(4, (0, common_1.Body)('type')),
    __param(5, (0, common_1.Body)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AttachmentController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/attachments'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get all attachments for a patient' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of patient attachments' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Patient not found in this clinic' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttachmentController.prototype, "findByPatient", null);
__decorate([
    (0, common_1.Get)('attachments/:id/file'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Serve the attachment file (auth via query token)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('token')),
    __param(2, (0, common_1.Query)('clinic_id')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AttachmentController.prototype, "serveFile", null);
__decorate([
    (0, common_1.Delete)('attachments/:id'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an attachment' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttachmentController.prototype, "remove", null);
exports.AttachmentController = AttachmentController = __decorate([
    (0, swagger_1.ApiTags)('Attachments'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [attachment_service_js_1.AttachmentService,
        jwt_1.JwtService])
], AttachmentController);
//# sourceMappingURL=attachment.controller.js.map