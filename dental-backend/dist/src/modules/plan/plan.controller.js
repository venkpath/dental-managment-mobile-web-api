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
exports.PlanController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const plan_service_js_1 = require("./plan.service.js");
const index_js_1 = require("./dto/index.js");
let PlanController = class PlanController {
    planService;
    constructor(planService) {
        this.planService = planService;
    }
    async create(dto) {
        return this.planService.create(dto);
    }
    async findAll() {
        return this.planService.findAll();
    }
    async findOne(id) {
        return this.planService.findOne(id);
    }
    async update(id, dto) {
        return this.planService.update(id, dto);
    }
    async assignFeatures(id, dto) {
        return this.planService.assignFeatures(id, dto);
    }
    async getFeatures(id) {
        return this.planService.getFeatures(id);
    }
    async remove(id) {
        return this.planService.remove(id);
    }
};
exports.PlanController = PlanController;
__decorate([
    (0, common_1.Post)(),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new subscription plan' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Plan created successfully' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Plan with this name already exists' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.CreatePlanDto]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all subscription plans' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of plans' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a plan by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Plan found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Plan not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a subscription plan' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Plan updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Plan not found' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Plan with this name already exists' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.UpdatePlanDto]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/features'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Assign features to a plan' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Features assigned successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Plan or feature not found' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.AssignFeaturesDto]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "assignFeatures", null);
__decorate([
    (0, common_1.Get)(':id/features'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get features assigned to a plan' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of plan features' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Plan not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "getFeatures", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a subscription plan' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Plan deleted successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Plan not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlanController.prototype, "remove", null);
exports.PlanController = PlanController = __decorate([
    (0, swagger_1.ApiTags)('Plans'),
    (0, common_1.Controller)('plans'),
    __metadata("design:paramtypes", [plan_service_js_1.PlanService])
], PlanController);
//# sourceMappingURL=plan.controller.js.map