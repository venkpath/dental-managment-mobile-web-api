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
var ClinicController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const https_1 = require("https");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const crypto_1 = require("crypto");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const clinic_service_js_1 = require("./clinic.service.js");
const index_js_1 = require("./dto/index.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let ClinicController = class ClinicController {
    static { ClinicController_1 = this; }
    clinicService;
    s3Service;
    prisma;
    logger = new common_1.Logger(ClinicController_1.name);
    constructor(clinicService, s3Service, prisma) {
        this.clinicService = clinicService;
        this.s3Service = s3Service;
        this.prisma = prisma;
    }
    async create(dto) {
        return this.clinicService.create(dto);
    }
    static pincodeCache = new Map();
    async lookupPincode(pin) {
        if (!/^\d{6}$/.test(pin))
            throw new common_1.BadRequestException('Pincode must be exactly 6 digits');
        if (ClinicController_1.pincodeCache.has(pin)) {
            return ClinicController_1.pincodeCache.get(pin) ?? null;
        }
        const result = await new Promise((resolve) => {
            const url = `https://api.postalpincode.in/pincode/${pin}`;
            const req = (0, https_1.get)(url, { rejectUnauthorized: false }, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        if (json[0]?.Status === 'Success' && json[0].PostOffice?.length) {
                            const { State, Country } = json[0].PostOffice[0];
                            resolve({ state: State, country: Country });
                        }
                        else {
                            resolve(null);
                        }
                    }
                    catch {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => resolve(null));
            req.setTimeout(6000, () => { req.destroy(); resolve(null); });
        });
        ClinicController_1.pincodeCache.set(pin, result);
        return result;
    }
    async getOnboardingStatus(user) {
        return this.clinicService.getOnboardingStatus(user.clinicId);
    }
    async getMyClinic(user) {
        const clinic = await this.clinicService.findOne(user.clinicId);
        const baseline = clinic.last_active_at ?? clinic.created_at;
        const daysInactive = Math.floor((Date.now() - baseline.getTime()) / (24 * 60 * 60 * 1000));
        return {
            ...clinic,
            days_inactive: daysInactive,
            inactivity_warning: !clinic.is_suspended && daysInactive >= 30,
            days_until_suspension: clinic.is_suspended ? 0 : Math.max(0, 45 - daysInactive),
        };
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
        let buffer = await this.s3Service.getObject(key);
        if (!buffer) {
            const diskPath = (0, path_1.join)(process.cwd(), 'uploads', 'logos', clinicId, filename);
            try {
                buffer = await (0, promises_1.readFile)(diskPath);
                const ext2 = (0, path_1.extname)(filename).toLowerCase();
                const mime = ext2 === '.png' ? 'image/png' :
                    ext2 === '.webp' ? 'image/webp' :
                        ext2 === '.svg' ? 'image/svg+xml' :
                            'image/jpeg';
                this.s3Service.upload(key, buffer, mime).catch((err) => {
                    this.logger.warn(`Lazy S3 migration failed for ${key}: ${String(err)}`);
                });
            }
            catch {
                throw new common_1.BadRequestException('Logo not found');
            }
        }
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
    async serveBranchPhoto(clinicId, branchId, res) {
        const branch = await this.prisma.branch.findFirst({
            where: { id: branchId, clinic_id: clinicId },
            select: { photo_url: true },
        });
        if (!branch?.photo_url)
            throw new common_1.BadRequestException('Branch photo not found');
        const buffer = await this.s3Service.getObject(branch.photo_url);
        if (!buffer)
            throw new common_1.BadRequestException('Branch photo not found');
        const ext = (0, path_1.extname)(branch.photo_url).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' :
            ext === '.webp' ? 'image/webp' :
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
    (0, common_1.Get)('pincode/:pin'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Look up state/country from a 6-digit Indian pincode' }),
    (0, swagger_1.ApiOkResponse)({ description: 'state and country, or null if not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('pin')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "lookupPincode", null);
__decorate([
    (0, common_1.Get)('me/onboarding-status'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get clinic profile completion checklist and percentage' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Onboarding checklist with percentage' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "getOnboardingStatus", null);
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
__decorate([
    (0, common_1.Get)(':clinicId/branch-photo/:branchId'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Serve branch cover photo (public)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ClinicController.prototype, "serveBranchPhoto", null);
exports.ClinicController = ClinicController = ClinicController_1 = __decorate([
    (0, swagger_1.ApiTags)('Clinics'),
    (0, common_1.Controller)('clinics'),
    __metadata("design:paramtypes", [clinic_service_js_1.ClinicService,
        s3_service_js_1.S3Service,
        prisma_service_js_1.PrismaService])
], ClinicController);
//# sourceMappingURL=clinic.controller.js.map