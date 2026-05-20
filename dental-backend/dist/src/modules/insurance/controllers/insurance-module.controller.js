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
exports.InsuranceModuleController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const current_clinic_decorator_js_1 = require("../../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../../common/guards/require-clinic.guard.js");
const roles_decorator_js_1 = require("../../../common/decorators/roles.decorator.js");
const index_js_1 = require("../../user/dto/index.js");
const prisma_service_js_1 = require("../../../database/prisma.service.js");
const clinic_feature_service_js_1 = require("../../feature/clinic-feature.service.js");
class ToggleDto {
    enabled;
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ToggleDto.prototype, "enabled", void 0);
let InsuranceModuleController = class InsuranceModuleController {
    prisma;
    clinicFeatureService;
    constructor(prisma, clinicFeatureService) {
        this.prisma = prisma;
        this.clinicFeatureService = clinicFeatureService;
    }
    async status(clinicId) {
        const feature = await this.prisma.feature.findUnique({
            where: { key: 'INSURANCE_MODULE' },
            select: { id: true },
        });
        if (!feature) {
            return { available: false, enabled: false, reason: 'Feature not registered' };
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { plan_id: true, plan: { select: { name: true } } },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        const planFeature = clinic.plan_id
            ? await this.prisma.planFeature.findUnique({
                where: { plan_id_feature_id: { plan_id: clinic.plan_id, feature_id: feature.id } },
                select: { is_enabled: true },
            })
            : null;
        const available = !!planFeature;
        const effective = await this.clinicFeatureService.getEffectiveFeatureKeys(clinicId);
        const enabled = effective.includes('INSURANCE_MODULE');
        return {
            available,
            enabled,
            plan_name: clinic.plan?.name ?? null,
        };
    }
    async toggle(clinicId, dto) {
        if (typeof dto?.enabled !== 'boolean') {
            throw new common_1.BadRequestException('`enabled` boolean required');
        }
        const feature = await this.prisma.feature.findUnique({
            where: { key: 'INSURANCE_MODULE' },
            select: { id: true },
        });
        if (!feature)
            throw new common_1.NotFoundException('INSURANCE_MODULE feature not registered');
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { plan_id: true, plan: { select: { name: true } } },
        });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        const planFeature = clinic.plan_id
            ? await this.prisma.planFeature.findUnique({
                where: { plan_id_feature_id: { plan_id: clinic.plan_id, feature_id: feature.id } },
                select: { is_enabled: true },
            })
            : null;
        if (!planFeature) {
            throw new common_1.ForbiddenException(`The Insurance & EHS module is not included in the ${clinic.plan?.name ?? 'current'} plan. Upgrade to Professional or higher to enable it.`);
        }
        await this.clinicFeatureService.upsertOverrides(clinicId, [
            { feature_id: feature.id, is_enabled: dto.enabled },
        ]);
        return { available: true, enabled: dto.enabled };
    }
};
exports.InsuranceModuleController = InsuranceModuleController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get insurance module availability + activation state' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InsuranceModuleController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('toggle'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN, index_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Enable or disable insurance module for the clinic (admin only)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ToggleDto]),
    __metadata("design:returntype", Promise)
], InsuranceModuleController.prototype, "toggle", null);
exports.InsuranceModuleController = InsuranceModuleController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Module Activation'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('insurance/module'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        clinic_feature_service_js_1.ClinicFeatureService])
], InsuranceModuleController);
//# sourceMappingURL=insurance-module.controller.js.map