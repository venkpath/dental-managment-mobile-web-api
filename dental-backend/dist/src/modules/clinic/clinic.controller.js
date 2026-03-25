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
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const clinic_service_js_1 = require("./clinic.service.js");
const index_js_1 = require("./dto/index.js");
let ClinicController = class ClinicController {
    clinicService;
    constructor(clinicService) {
        this.clinicService = clinicService;
    }
    async create(dto) {
        return this.clinicService.create(dto);
    }
    async getMyClinic(user) {
        return this.clinicService.findOne(user.clinicId);
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
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiBearerAuth)(),
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
exports.ClinicController = ClinicController = __decorate([
    (0, swagger_1.ApiTags)('Clinics'),
    (0, common_1.Controller)('clinics'),
    __metadata("design:paramtypes", [clinic_service_js_1.ClinicService])
], ClinicController);
//# sourceMappingURL=clinic.controller.js.map