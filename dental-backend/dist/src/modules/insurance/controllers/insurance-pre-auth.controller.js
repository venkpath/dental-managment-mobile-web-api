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
exports.InsurancePreAuthServeController = exports.InsurancePreAuthController = void 0;
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
const insurance_pre_auth_service_js_1 = require("../services/insurance-pre-auth.service.js");
const VALID_SLOTS = ['request', 'approval', 'rejection'];
let InsurancePreAuthController = class InsurancePreAuthController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findAll(clinicId, status, patient_id, skip, take) {
        return this.svc.findAll(clinicId, { status, patient_id, skip, take });
    }
    findOne(clinicId, id) {
        return this.svc.findOne(id, clinicId);
    }
    create(clinicId, dto) {
        return this.svc.create(clinicId, dto);
    }
    submit(clinicId, user, id, dto) {
        return this.svc.submit(id, clinicId, dto, user.sub);
    }
    updateStatus(clinicId, id, dto) {
        return this.svc.updateStatus(id, clinicId, dto);
    }
    uploadDocument(clinicId, id, slot, file) {
        if (!VALID_SLOTS.includes(slot)) {
            throw new Error(`Invalid slot: ${slot}. Must be one of: ${VALID_SLOTS.join(', ')}`);
        }
        return this.svc.uploadDocument(id, clinicId, slot, file);
    }
    getDownloadToken(clinicId, id, slot) {
        if (!VALID_SLOTS.includes(slot)) {
            throw new Error(`Invalid slot: ${slot}`);
        }
        return this.svc.getDownloadToken(id, clinicId, slot);
    }
};
exports.InsurancePreAuthController = InsurancePreAuthController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST, index_js_1.UserRole.DENTIST, index_js_1.UserRole.CONSULTANT),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('patient_id')),
    __param(3, (0, common_1.Query)('skip', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('take', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], InsurancePreAuthController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST, index_js_1.UserRole.DENTIST, index_js_1.UserRole.CONSULTANT),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InsurancePreAuthController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InsurancePreAuthController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], InsurancePreAuthController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/status'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], InsurancePreAuthController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/documents/:slot'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: undefined, limits: { fileSize: 15 * 1024 * 1024 } })),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('slot')),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], InsurancePreAuthController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)(':id/download-token'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST, index_js_1.UserRole.DENTIST, index_js_1.UserRole.CONSULTANT),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('slot')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], InsurancePreAuthController.prototype, "getDownloadToken", null);
exports.InsurancePreAuthController = InsurancePreAuthController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Pre-Authorisation'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, common_1.Controller)('insurance/pre-auths'),
    __metadata("design:paramtypes", [insurance_pre_auth_service_js_1.InsurancePreAuthService])
], InsurancePreAuthController);
let InsurancePreAuthServeController = class InsurancePreAuthServeController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    serve(clinicId, filePath, token, res) {
        const absPath = this.svc.serveFile(clinicId, filePath, token);
        const ext = filePath.split('.').pop()?.toLowerCase();
        const mime = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        (0, fs_1.createReadStream)(absPath).pipe(res);
    }
};
exports.InsurancePreAuthServeController = InsurancePreAuthServeController;
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Get)('files/serve'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('clinic_id')),
    __param(1, (0, common_1.Query)('file')),
    __param(2, (0, common_1.Query)('token')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], InsurancePreAuthServeController.prototype, "serve", null);
exports.InsurancePreAuthServeController = InsurancePreAuthServeController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Pre-Authorisation'),
    (0, common_1.Controller)('insurance/pre-auths'),
    __metadata("design:paramtypes", [insurance_pre_auth_service_js_1.InsurancePreAuthService])
], InsurancePreAuthServeController);
//# sourceMappingURL=insurance-pre-auth.controller.js.map