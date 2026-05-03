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
exports.ClinicController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const crypto_1 = require("crypto");
const path_1 = require("path");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const clinic_service_js_1 = require("./clinic.service.js");
const index_js_1 = require("./dto/index.js");
let ClinicController = class ClinicController {
    clinicService;
    s3Service;
    constructor(clinicService, s3Service) {
        this.clinicService = clinicService;
        this.s3Service = s3Service;
    }
    async create(dto) {
        return this.clinicService.create(dto);
    }
    async getMyClinic(user) {
        return this.clinicService.findOne(user.clinicId);
    }
    async getMyFeatures(user) {
        return this.clinicService.getFeatures(user.clinicId);
    }
    async updateMyClinic(user, dto) {
        return this.clinicService.update(user.clinicId, dto);
    }
    async findAll() {
        return this.clinicService.findAll();
    }
    async findOne(id) {
        return this.clinicService.findOne(id);
    }
    async update(id, dto) {
        return this.clinicService.update(id, dto);
    }
    async updateSubscription(id, dto) {
        return this.clinicService.updateSubscription(id, dto);
    }
    async uploadLogo(user, file) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (!allowed.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Only JPEG, PNG, WebP, or SVG images allowed');
        }
        const ext = ((0, path_1.extname)(file.originalname) || '.jpg').toLowerCase();
        const key = `clinics/${user.clinicId}/logos/${(0, crypto_1.randomUUID)()}${ext}`;
        await this.s3Service.upload(key, file.buffer, file.mimetype);
        return this.clinicService.update(user.clinicId, { logo_url: key });
    }
    async serveLogo(clinicId, filename, res) {
        if (!/^[A-Za-z0-9-]+$/.test(clinicId) || !/^[A-Za-z0-9._-]+$/.test(filename)) {
            throw new common_1.BadRequestException('Invalid path');
        }
        const key = `clinics/${clinicId}/logos/${filename}`;
        const buffer = await this.s3Service.getObject(key);
        if (!buffer)
            throw new common_1.BadRequestException('Logo not found');
        const ext = (0, path_1.extname)(filename).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' :
            ext === '.webp' ? 'image/webp' :
                ext === '.svg' ? 'image/svg+xml' :
                    'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.send(buffer);
    }
};
exports.ClinicController = ClinicController;
__decorate([
    (0, common_1.Post)(),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new clinic (onboarding)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Clinic created successfully with 14-day trial' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.CreateClinicDto]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get the current user\'s clinic details' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Clinic details' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "getMyClinic", null);
__decorate([
    (0, common_1.Get)('me/features'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get the current clinic\'s plan + enabled feature keys' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Plan name, limits, and feature flags enabled for this clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "getMyFeatures", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update the current user\'s clinic details' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Clinic updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.UpdateClinicDto]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "updateMyClinic", null);
__decorate([
    (0, common_1.Get)(),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all clinics (Super Admin)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of clinics' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a clinic by ID (Super Admin)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Clinic found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Clinic not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update clinic details (Super Admin)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Clinic updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Clinic not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.UpdateClinicDto]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/subscription'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update clinic subscription (Super Admin only)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Subscription updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Clinic not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.UpdateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Post)('me/logo'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Upload clinic logo' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOkResponse)({ description: 'Logo uploaded and clinic updated' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 5 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.Get)('logo/:clinicId/:filename'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Serve clinic logo (public)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "serveLogo", null);
exports.ClinicController = ClinicController = __decorate([
    (0, swagger_1.ApiTags)('Clinics'),
    (0, common_1.Controller)('clinics'),
    __metadata("design:paramtypes", [clinic_service_js_1.ClinicService,
        s3_service_js_1.S3Service])
], ClinicController);
//# sourceMappingURL=clinic.controller.js.map