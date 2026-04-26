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
exports.CampaignController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
const index_js_1 = require("../user/dto/index.js");
const campaign_service_js_1 = require("./campaign.service.js");
const create_campaign_dto_js_1 = require("./dto/create-campaign.dto.js");
const update_campaign_dto_js_1 = require("./dto/update-campaign.dto.js");
const query_campaign_dto_js_1 = require("./dto/query-campaign.dto.js");
let CampaignController = class CampaignController {
    campaignService;
    constructor(campaignService) {
        this.campaignService = campaignService;
    }
    async create(clinicId, user, dto) {
        return this.campaignService.create(clinicId, user.sub, dto);
    }
    async findAll(clinicId, query) {
        return this.campaignService.findAll(clinicId, query);
    }
    async findOne(clinicId, id) {
        return this.campaignService.findOne(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.campaignService.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.campaignService.delete(clinicId, id);
    }
    async execute(clinicId, id) {
        return this.campaignService.execute(clinicId, id);
    }
    async audiencePreview(clinicId, body) {
        return this.campaignService.getAudiencePreview(clinicId, body.segment_type, body.segment_config);
    }
    async listTreatmentProcedures(clinicId) {
        return this.campaignService.listTreatmentProcedures(clinicId);
    }
    async analytics(clinicId, id) {
        return this.campaignService.getAnalytics(clinicId, id);
    }
    async executeABTest(clinicId, id, body) {
        return this.campaignService.executeABTest(clinicId, id, body.variant_template_id, body.split_percentage);
    }
    async getABTestResults(clinicId, id) {
        return this.campaignService.getABTestResults(clinicId, id);
    }
    async createDripSequence(clinicId, user, body) {
        return this.campaignService.createDripSequence(clinicId, user.sub, body);
    }
    async executeDripStep(clinicId, id, step) {
        return this.campaignService.executeDripStep(clinicId, id, parseInt(step, 10));
    }
    async estimateCost(clinicId, body) {
        return this.campaignService.estimateCost(clinicId, body);
    }
    async createFromEvent(clinicId, user, eventId) {
        return this.campaignService.createFromFestivalEvent(clinicId, user.sub, eventId);
    }
};
exports.CampaignController = CampaignController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a marketing campaign' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Campaign created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_campaign_dto_js_1.CreateCampaignDto]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List campaigns' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Paginated campaign list' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_campaign_dto_js_1.QueryCampaignDto]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get campaign details' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update a campaign (draft/scheduled only)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_campaign_dto_js_1.UpdateCampaignDto]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a campaign' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/execute'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Execute a campaign — sends messages to all targeted patients' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "execute", null);
__decorate([
    (0, common_1.Post)('audience-preview'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Preview audience for a segment (shows count + sample patients)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "audiencePreview", null);
__decorate([
    (0, common_1.Get)('treatment-procedures'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List distinct treatment procedures performed at this clinic, with patient counts (for the By Treatment campaign segment dropdown)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "listTreatmentProcedures", null);
__decorate([
    (0, common_1.Get)(':id/analytics'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get campaign analytics (delivery stats + attribution)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "analytics", null);
__decorate([
    (0, common_1.Post)(':id/ab-test'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Execute campaign as A/B test with two template variants' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "executeABTest", null);
__decorate([
    (0, common_1.Get)(':id/ab-results'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get A/B test results — compare delivery rates between variants' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getABTestResults", null);
__decorate([
    (0, common_1.Post)('drip-sequence'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a multi-step drip campaign (e.g., Day 0 → Day 7 → Day 21)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "createDripSequence", null);
__decorate([
    (0, common_1.Post)(':id/drip-step/:step'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger a specific drip step' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('step')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "executeDripStep", null);
__decorate([
    (0, common_1.Post)('estimate-cost'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Estimate campaign cost before execution' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "estimateCost", null);
__decorate([
    (0, common_1.Post)('from-event/:eventId'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a campaign from a festival event (one-click with offer details)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('eventId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "createFromEvent", null);
exports.CampaignController = CampaignController = __decorate([
    (0, swagger_1.ApiTags)('Campaigns'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('MARKETING_CAMPAIGNS'),
    (0, common_1.Controller)('campaigns'),
    __metadata("design:paramtypes", [campaign_service_js_1.CampaignService])
], CampaignController);
//# sourceMappingURL=campaign.controller.js.map