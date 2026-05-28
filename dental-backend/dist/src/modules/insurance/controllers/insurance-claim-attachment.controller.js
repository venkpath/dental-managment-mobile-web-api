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
exports.InsuranceClaimAttachmentServeController = exports.InsuranceClaimAttachmentController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const fs_1 = require("fs");
const current_clinic_decorator_js_1 = require("../../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../../common/decorators/current-user.decorator.js");
const require_clinic_guard_js_1 = require("../../../common/guards/require-clinic.guard.js");
const require_feature_decorator_js_1 = require("../../../common/decorators/require-feature.decorator.js");
const roles_decorator_js_1 = require("../../../common/decorators/roles.decorator.js");
const public_decorator_js_1 = require("../../../common/decorators/public.decorator.js");
const index_js_1 = require("../../user/dto/index.js");
const insurance_claim_attachment_service_js_1 = require("../services/insurance-claim-attachment.service.js");
let InsuranceClaimAttachmentController = class InsuranceClaimAttachmentController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    list(clinicId, claimId) {
        return this.svc.list(claimId, clinicId);
    }
    upload(clinicId, user, claimId, file, type, description) {
        return this.svc.upload({ claimId, clinicId, userId: user.sub, type, description, file });
    }
    getDownloadToken(clinicId, claimId, attachmentId) {
        return this.svc.getDownloadToken(attachmentId, claimId, clinicId);
    }
    delete(clinicId, claimId, attachmentId) {
        return this.svc.delete(attachmentId, claimId, clinicId);
    }
};
exports.InsuranceClaimAttachmentController = InsuranceClaimAttachmentController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST, index_js_1.UserRole.DENTIST, index_js_1.UserRole.CONSULTANT),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('claimId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InsuranceClaimAttachmentController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: undefined, limits: { fileSize: 15 * 1024 * 1024 } })),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('claimId')),
    __param(3, (0, common_1.UploadedFile)()),
    __param(4, (0, common_1.Body)('type')),
    __param(5, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object, String, String]),
    __metadata("design:returntype", void 0)
], InsuranceClaimAttachmentController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':attachmentId/download-token'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST, index_js_1.UserRole.DENTIST, index_js_1.UserRole.CONSULTANT),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('claimId')),
    __param(2, (0, common_1.Param)('attachmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], InsuranceClaimAttachmentController.prototype, "getDownloadToken", null);
__decorate([
    (0, common_1.Delete)(':attachmentId'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('claimId')),
    __param(2, (0, common_1.Param)('attachmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], InsuranceClaimAttachmentController.prototype, "delete", null);
exports.InsuranceClaimAttachmentController = InsuranceClaimAttachmentController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Claim Attachments'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, common_1.Controller)('insurance/claims/:claimId/attachments'),
    __metadata("design:paramtypes", [insurance_claim_attachment_service_js_1.InsuranceClaimAttachmentService])
], InsuranceClaimAttachmentController);
let InsuranceClaimAttachmentServeController = class InsuranceClaimAttachmentServeController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async serve(clinicId, filePath, token, res) {
        const absPath = this.svc.serveFile(clinicId, filePath, token);
        const ext = filePath.split('.').pop()?.toLowerCase();
        const mime = ext === 'pdf' ? 'application/pdf'
            : ext === 'png' ? 'image/png'
                : ext === 'webp' ? 'image/webp'
                    : ext === 'gif' ? 'image/gif'
                        : ext === 'zip' ? 'application/zip'
                            : 'image/jpeg';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        (0, fs_1.createReadStream)(absPath).pipe(res);
    }
};
exports.InsuranceClaimAttachmentServeController = InsuranceClaimAttachmentServeController;
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Get)('serve'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('clinic_id')),
    __param(1, (0, common_1.Query)('file')),
    __param(2, (0, common_1.Query)('token')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], InsuranceClaimAttachmentServeController.prototype, "serve", null);
exports.InsuranceClaimAttachmentServeController = InsuranceClaimAttachmentServeController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Claim Attachments'),
    (0, common_1.Controller)('insurance/claims/attachments'),
    __metadata("design:paramtypes", [insurance_claim_attachment_service_js_1.InsuranceClaimAttachmentService])
], InsuranceClaimAttachmentServeController);
//# sourceMappingURL=insurance-claim-attachment.controller.js.map