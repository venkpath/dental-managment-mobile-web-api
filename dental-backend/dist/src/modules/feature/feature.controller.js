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
exports.FeatureController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const feature_service_js_1 = require("./feature.service.js");
const index_js_1 = require("./dto/index.js");
let FeatureController = class FeatureController {
    featureService;
    constructor(featureService) {
        this.featureService = featureService;
    }
    async create(dto) {
        return this.featureService.create(dto);
    }
    async findAll() {
        return this.featureService.findAll();
    }
    async remove(id) {
        return this.featureService.remove(id);
    }
};
exports.FeatureController = FeatureController;
__decorate([
    (0, common_1.Post)(),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new feature flag' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Feature created successfully' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Feature with this key already exists' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.CreateFeatureDto]),
    __metadata("design:returntype", Promise)
], FeatureController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all features' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of features' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FeatureController.prototype, "findAll", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a feature flag' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Feature deleted successfully' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FeatureController.prototype, "remove", null);
exports.FeatureController = FeatureController = __decorate([
    (0, swagger_1.ApiTags)('Features'),
    (0, common_1.Controller)('features'),
    __metadata("design:paramtypes", [feature_service_js_1.FeatureService])
], FeatureController);
//# sourceMappingURL=feature.controller.js.map