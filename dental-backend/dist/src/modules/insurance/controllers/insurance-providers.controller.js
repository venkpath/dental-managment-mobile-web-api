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
exports.InsuranceProvidersController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_clinic_decorator_js_1 = require("../../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../../common/guards/require-clinic.guard.js");
const require_feature_decorator_js_1 = require("../../../common/decorators/require-feature.decorator.js");
const insurance_providers_service_js_1 = require("../services/insurance-providers.service.js");
let InsuranceProvidersController = class InsuranceProvidersController {
    providers;
    constructor(providers) {
        this.providers = providers;
    }
    async list(clinicId, country, type) {
        return this.providers.listProviders(clinicId, { country, type });
    }
    async get(clinicId, id) {
        return this.providers.getProvider(clinicId, id);
    }
    async getPlan(clinicId, id) {
        return this.providers.getPlan(clinicId, id);
    }
};
exports.InsuranceProvidersController = InsuranceProvidersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List insurance providers + plans available to the current clinic' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Active providers (global + clinic-specific) with their plans' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('country')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InsuranceProvidersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single insurance provider with all its plans' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InsuranceProvidersController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('plans/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single insurance plan (with provider + procedure codes)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InsuranceProvidersController.prototype, "getPlan", null);
exports.InsuranceProvidersController = InsuranceProvidersController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Providers'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, common_1.Controller)('insurance/providers'),
    __metadata("design:paramtypes", [insurance_providers_service_js_1.InsuranceProvidersService])
], InsuranceProvidersController);
//# sourceMappingURL=insurance-providers.controller.js.map