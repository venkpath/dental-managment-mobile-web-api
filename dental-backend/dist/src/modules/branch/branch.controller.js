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
exports.BranchController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const branch_service_js_1 = require("./branch.service.js");
const branch_prescription_template_service_js_1 = require("./branch-prescription-template.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
let BranchController = class BranchController {
    branchService;
    templateService;
    constructor(branchService, templateService) {
        this.branchService = branchService;
        this.templateService = templateService;
    }
    async create(clinicId, dto) {
        return this.branchService.create(clinicId, dto);
    }
    async findAll(clinicId) {
        return this.branchService.findAll(clinicId);
    }
    async findOne(clinicId, id) {
        return this.branchService.findOne(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.branchService.update(clinicId, id, dto);
    }
    async getSchedulingSettings(clinicId, id) {
        return this.branchService.getSchedulingSettings(clinicId, id);
    }
    async updateSchedulingSettings(clinicId, id, dto) {
        return this.branchService.updateSchedulingSettings(clinicId, id, dto);
    }
    async getTemplate(clinicId, id) {
        return this.templateService.getTemplate(clinicId, id);
    }
    async uploadTemplateImage(clinicId, id, file) {
        return this.templateService.uploadImage(clinicId, id, file);
    }
    async saveTemplateConfig(clinicId, id, dto) {
        return this.templateService.saveConfig(clinicId, id, dto.config, dto.enabled);
    }
    async deleteTemplate(clinicId, id) {
        return this.templateService.deleteTemplate(clinicId, id);
    }
    async previewTemplate(clinicId, id, dto, res) {
        const buffer = await this.templateService.generatePreview(clinicId, id, dto.config, dto.with_background ?? true);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="prescription-preview.pdf"');
        res.send(buffer);
    }
    async serveTemplateImage(clinicId, id, filename, _cacheBuster, res) {
        await this.branchService.findOne(clinicId, id);
        const filePath = this.templateService.resolveTemplateFile(id, filename);
        if (!filePath)
            throw new common_1.BadRequestException('Template image not found');
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.sendFile(filePath);
    }
};
exports.BranchController = BranchController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new branch for the current clinic' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Branch created successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateBranchDto]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all branches for the current clinic' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of branches' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a branch by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Branch found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Branch not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update a branch' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Branch updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Branch not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateBranchDto]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/scheduling'),
    (0, swagger_1.ApiOperation)({ summary: 'Get scheduling settings for a branch' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Branch scheduling settings with defaults applied' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Branch not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "getSchedulingSettings", null);
__decorate([
    (0, common_1.Patch)(':id/scheduling'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update scheduling settings for a branch (working hours, slot duration, etc.)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Scheduling settings updated' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Branch not found' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Invalid scheduling settings' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateBranchSchedulingDto]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "updateSchedulingSettings", null);
__decorate([
    (0, common_1.Get)(':id/prescription-template'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the branch prescription notepad template (image + zone config)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Post)(':id/prescription-template/image'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Upload the branch notepad scan (PNG or JPEG, ≤8MB)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Image uploaded; returns server-validated dimensions' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 8 * 1024 * 1024 } })),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "uploadTemplateImage", null);
__decorate([
    (0, common_1.Patch)(':id/prescription-template/config'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Save zone coordinates + enable the template' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Template config saved' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.SaveTemplateConfigDto]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "saveTemplateConfig", null);
__decorate([
    (0, common_1.Delete)(':id/prescription-template'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Remove the custom template — branch falls back to default layout' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Post)(':id/prescription-template/preview'),
    (0, swagger_1.ApiOperation)({ summary: 'Render a sample prescription PDF using the posted config (does not persist)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'application/pdf binary stream' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.PreviewTemplateDto, Object]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "previewTemplate", null);
__decorate([
    (0, common_1.Get)(':id/prescription-template/image/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve the raw notepad image for the designer canvas' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('filename')),
    __param(3, (0, common_1.Query)('t')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], BranchController.prototype, "serveTemplateImage", null);
exports.BranchController = BranchController = __decorate([
    (0, swagger_1.ApiTags)('Branches'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('branches'),
    __metadata("design:paramtypes", [branch_service_js_1.BranchService,
        branch_prescription_template_service_js_1.BranchPrescriptionTemplateService])
], BranchController);
//# sourceMappingURL=branch.controller.js.map