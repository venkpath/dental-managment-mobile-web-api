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
exports.TemplateController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
const template_service_js_1 = require("./template.service.js");
const create_template_dto_js_1 = require("./dto/create-template.dto.js");
const update_template_dto_js_1 = require("./dto/update-template.dto.js");
const query_template_dto_js_1 = require("./dto/query-template.dto.js");
let TemplateController = class TemplateController {
    templateService;
    constructor(templateService) {
        this.templateService = templateService;
    }
    async getBaseWhatsAppTemplates(clinicId) {
        const bases = await this.templateService.getBaseWhatsAppTemplates();
        const enriched = await Promise.all(bases.map(async (t) => ({
            ...t,
            alreadyCreated: await this.templateService.clinicHasWhatsAppTemplate(clinicId, t.template_name),
        })));
        return enriched;
    }
    async cloneBaseTemplate(clinicId, id) {
        return this.templateService.cloneBaseTemplateForClinic(clinicId, id);
    }
    async create(clinicId, dto) {
        return this.templateService.create(clinicId, dto);
    }
    async findAll(clinicId, query) {
        return this.templateService.findAll(clinicId, query);
    }
    async findOne(clinicId, id) {
        return this.templateService.findOne(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.templateService.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.templateService.remove(clinicId, id);
    }
};
exports.TemplateController = TemplateController;
__decorate([
    (0, common_1.Get)('whatsapp/base'),
    (0, swagger_1.ApiOperation)({
        summary: 'List Smart Dental Desk base WhatsApp templates',
        description: 'Pre-approved base templates you can clone and submit to your WABA. Includes sampleValues and metaCategory for each template, plus an `alreadyCreated` flag indicating whether the clinic already has a template with that name.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of base WhatsApp templates with sample data' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TemplateController.prototype, "getBaseWhatsAppTemplates", null);
__decorate([
    (0, common_1.Post)('whatsapp/base/:id/clone'),
    (0, require_feature_decorator_js_1.RequireFeature)('CUSTOM_TEMPLATES'),
    (0, swagger_1.ApiOperation)({
        summary: 'Clone a base WhatsApp template into your clinic',
        description: 'Creates a clinic-owned copy of a base template. After cloning, submit it to Meta for approval via POST /communication/whatsapp/templates/submit. Requires the CUSTOM_TEMPLATES feature (Enterprise plan).',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Template cloned (or already exists)' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Plan does not include CUSTOM_TEMPLATES — upgrade to Enterprise to create your own templates' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TemplateController.prototype, "cloneBaseTemplate", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_feature_decorator_js_1.RequireFeature)('CUSTOM_TEMPLATES'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a message template (Enterprise plan only)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Template created' }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Plan does not include CUSTOM_TEMPLATES — upgrade to Enterprise to create your own templates' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_template_dto_js_1.CreateTemplateDto]),
    __metadata("design:returntype", Promise)
], TemplateController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List message templates (clinic + system)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Paginated list of templates' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_template_dto_js_1.QueryTemplateDto]),
    __metadata("design:returntype", Promise)
], TemplateController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a message template by ID' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TemplateController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, require_feature_decorator_js_1.RequireFeature)('CUSTOM_TEMPLATES'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a clinic-owned template (Enterprise plan only)',
        description: 'Only modifies templates the clinic created. System-approved templates remain immutable for everyone.',
    }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Plan does not include CUSTOM_TEMPLATES — upgrade to Enterprise to edit your own templates' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_template_dto_js_1.UpdateTemplateDto]),
    __metadata("design:returntype", Promise)
], TemplateController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_feature_decorator_js_1.RequireFeature)('CUSTOM_TEMPLATES'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a clinic-owned template (Enterprise plan only)',
        description: 'Only deletes templates the clinic created. System-approved templates remain immutable for everyone.',
    }),
    (0, swagger_1.ApiForbiddenResponse)({ description: 'Plan does not include CUSTOM_TEMPLATES — upgrade to Enterprise to delete your own templates' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TemplateController.prototype, "remove", null);
exports.TemplateController = TemplateController = __decorate([
    (0, swagger_1.ApiTags)('Communication - Templates'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('communication/templates'),
    __metadata("design:paramtypes", [template_service_js_1.TemplateService])
], TemplateController);
//# sourceMappingURL=template.controller.js.map