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
exports.PlatformTemplateController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const platform_template_service_js_1 = require("./platform-template.service.js");
class UpdatePlatformTemplateDto {
    body;
    subject;
    language;
    is_active;
    category;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(4096),
    __metadata("design:type", String)
], UpdatePlatformTemplateDto.prototype, "body", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdatePlatformTemplateDto.prototype, "subject", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], UpdatePlatformTemplateDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePlatformTemplateDto.prototype, "is_active", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpdatePlatformTemplateDto.prototype, "category", void 0);
class PreviewPlatformTemplateDto {
    body;
    sampleValues;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(4096),
    __metadata("design:type", String)
], PreviewPlatformTemplateDto.prototype, "body", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], PreviewPlatformTemplateDto.prototype, "sampleValues", void 0);
let PlatformTemplateController = class PlatformTemplateController {
    service;
    constructor(service) {
        this.service = service;
    }
    async list() {
        return this.service.list();
    }
    async get(id) {
        return this.service.get(id);
    }
    async update(id, dto) {
        return this.service.update(id, dto);
    }
    preview(dto) {
        return this.service.preview(dto.body, dto.sampleValues ?? {});
    }
};
exports.PlatformTemplateController = PlatformTemplateController;
__decorate([
    (0, common_1.Get)(),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all platform templates (clinic_id=null + platform names)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Platform templates' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PlatformTemplateController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single platform template' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlatformTemplateController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update body / subject / language / active flag of a platform template' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdatePlatformTemplateDto]),
    __metadata("design:returntype", Promise)
], PlatformTemplateController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Render a template body with sample values (preview only, no DB write)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PreviewPlatformTemplateDto]),
    __metadata("design:returntype", void 0)
], PlatformTemplateController.prototype, "preview", null);
exports.PlatformTemplateController = PlatformTemplateController = __decorate([
    (0, swagger_1.ApiTags)('Super Admin · Platform Templates'),
    (0, common_1.Controller)('super-admins/platform-templates'),
    __metadata("design:paramtypes", [platform_template_service_js_1.PlatformTemplateService])
], PlatformTemplateController);
//# sourceMappingURL=platform-template.controller.js.map