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
exports.ReferralController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const index_js_1 = require("../user/dto/index.js");
const referral_service_js_1 = require("./referral.service.js");
const index_js_2 = require("./dto/index.js");
let ReferralController = class ReferralController {
    referralService;
    constructor(referralService) {
        this.referralService = referralService;
    }
    async getOrCreateCode(clinicId, patientId) {
        return this.referralService.getOrCreateReferralCode(clinicId, patientId);
    }
    async deactivateCode(clinicId, codeId) {
        return this.referralService.deactivateCode(clinicId, codeId);
    }
    async completeReferral(clinicId, dto) {
        return this.referralService.completeReferral(clinicId, dto);
    }
    async creditReward(clinicId, referralId) {
        return this.referralService.creditReward(clinicId, referralId);
    }
    async getStats(clinicId) {
        return this.referralService.getStats(clinicId);
    }
    async getDetailedAnalytics(clinicId, startDate, endDate) {
        return this.referralService.getDetailedAnalytics(clinicId, startDate, endDate);
    }
    async getLeaderboard(clinicId, limit) {
        return this.referralService.getLeaderboard(clinicId, limit ? parseInt(limit, 10) : 10);
    }
    async getPatientReferrals(clinicId, patientId) {
        return this.referralService.getPatientReferrals(clinicId, patientId);
    }
};
exports.ReferralController = ReferralController;
__decorate([
    (0, common_1.Post)('code/:patientId'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Generate or retrieve referral code for a patient' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getOrCreateCode", null);
__decorate([
    (0, common_1.Patch)('code/:codeId/deactivate'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate a referral code' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('codeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "deactivateCode", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Record a referral completion (when referred patient joins)' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_2.CompleteReferralDto]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "completeReferral", null);
__decorate([
    (0, common_1.Patch)(':referralId/credit'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mark referral reward as credited' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('referralId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "creditReward", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get referral program statistics' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed referral analytics — conversion rate, revenue, trends' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('start_date')),
    __param(2, (0, common_1.Query)('end_date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getDetailedAnalytics", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get top referrers leaderboard' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Get)('patient/:patientId'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all referrals made by a patient' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getPatientReferrals", null);
exports.ReferralController = ReferralController = __decorate([
    (0, swagger_1.ApiTags)('Referrals'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('referrals'),
    __metadata("design:paramtypes", [referral_service_js_1.ReferralService])
], ReferralController);
//# sourceMappingURL=referral.controller.js.map