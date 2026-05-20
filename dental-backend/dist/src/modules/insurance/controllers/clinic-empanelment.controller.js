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
exports.ClinicEmpanelmentController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const current_clinic_decorator_js_1 = require("../../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../../common/guards/require-clinic.guard.js");
const public_decorator_js_1 = require("../../../common/decorators/public.decorator.js");
const require_feature_decorator_js_1 = require("../../../common/decorators/require-feature.decorator.js");
const create_empanelment_dto_js_1 = require("../dto/create-empanelment.dto.js");
const update_empanelment_dto_js_1 = require("../dto/update-empanelment.dto.js");
const clinic_empanelment_service_js_1 = require("../services/clinic-empanelment.service.js");
const insurance_file_service_js_1 = require("../services/insurance-file.service.js");
const VALID_SLOTS = ['certificate', 'rate_card', 'tpa_mou'];
let ClinicEmpanelmentController = class ClinicEmpanelmentController {
    empanelments;
    files;
    constructor(empanelments, files) {
        this.empanelments = empanelments;
        this.files = files;
    }
    async list(clinicId) {
        return this.empanelments.list(clinicId);
    }
    async get(clinicId, id) {
        return this.empanelments.get(clinicId, id);
    }
    async create(clinicId, dto) {
        return this.empanelments.create(clinicId, dto);
    }
    async update(clinicId, id, dto) {
        return this.empanelments.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.empanelments.remove(clinicId, id);
    }
    async upload(clinicId, id, slot, file) {
        if (!VALID_SLOTS.includes(slot)) {
            throw new common_1.BadRequestException(`Invalid slot. Must be one of: ${VALID_SLOTS.join(', ')}`);
        }
        return this.empanelments.uploadDocument(clinicId, id, slot, file);
    }
    async getDownloadToken(clinicId, id, slot) {
        if (!VALID_SLOTS.includes(slot)) {
            throw new common_1.BadRequestException(`Invalid slot. Must be one of: ${VALID_SLOTS.join(', ')}`);
        }
        const row = await this.empanelments.get(clinicId, id);
        const field = {
            certificate: 'certificate_url',
            rate_card: 'rate_card_url',
            tpa_mou: 'tpa_mou_url',
        }[slot];
        const filePath = row[field];
        if (!filePath)
            throw new common_1.BadRequestException('No file uploaded for that slot');
        const { token } = this.files.buildDownloadUrl({ clinicId, filePath });
        return { token, file_url: filePath };
    }
    async serve(clinicId, filePath, token, res) {
        if (!clinicId || !filePath || !token) {
            throw new common_1.BadRequestException('Missing clinic_id, file or token');
        }
        const abs = this.files.resolveForServing({ clinicId, filePath, token });
        res.setHeader('Cache-Control', 'private, max-age=600');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.sendFile(abs);
    }
};
exports.ClinicEmpanelmentController = ClinicEmpanelmentController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, swagger_1.ApiOperation)({ summary: 'List the clinic\'s scheme empanelments' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClinicEmpanelmentController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClinicEmpanelmentController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new scheme empanelment for the clinic' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_empanelment_dto_js_1.CreateEmpanelmentDto]),
    __metadata("design:returntype", Promise)
], ClinicEmpanelmentController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_empanelment_dto_js_1.UpdateEmpanelmentDto]),
    __metadata("design:returntype", Promise)
], ClinicEmpanelmentController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClinicEmpanelmentController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/documents/:slot'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload empanelment cert / CGHS rate card / TPA MoU' }),
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
], ClinicEmpanelmentController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':id/download-token'),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, swagger_1.ApiOperation)({ summary: 'Mint a short-lived token for downloading one of this empanelment\'s files' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('slot')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClinicEmpanelmentController.prototype, "getDownloadToken", null);
__decorate([
    (0, common_1.Get)('files/serve'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Serve an insurance file by signed token + clinic id' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Streams the file' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('clinic_id')),
    __param(1, (0, common_1.Query)('file')),
    __param(2, (0, common_1.Query)('token')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ClinicEmpanelmentController.prototype, "serve", null);
exports.ClinicEmpanelmentController = ClinicEmpanelmentController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Clinic Empanelment'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.Controller)('insurance/empanelments'),
    __metadata("design:paramtypes", [clinic_empanelment_service_js_1.ClinicEmpanelmentService,
        insurance_file_service_js_1.InsuranceFileService])
], ClinicEmpanelmentController);
//# sourceMappingURL=clinic-empanelment.controller.js.map