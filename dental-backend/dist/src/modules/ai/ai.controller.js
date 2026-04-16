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
exports.AiController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ai_service_js_1 = require("./ai.service.js");
const index_js_1 = require("./dto/index.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const track_ai_usage_decorator_js_1 = require("../../common/decorators/track-ai-usage.decorator.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
let AiController = class AiController {
    aiService;
    constructor(aiService) {
        this.aiService = aiService;
    }
    async generateClinicalNotes(req, dto) {
        return this.aiService.generateClinicalNotes(req.user.clinicId, dto);
    }
    async generatePrescription(req, dto) {
        return this.aiService.generatePrescription(req.user.clinicId, dto);
    }
    async generateTreatmentPlan(req, dto) {
        return this.aiService.generateTreatmentPlan(req.user.clinicId, dto);
    }
    async generateRevenueInsights(req, dto) {
        return this.aiService.generateRevenueInsights(req.user.clinicId, dto);
    }
    async generateChartAnalysis(req, dto) {
        return this.aiService.generateChartAnalysis(req.user.clinicId, dto);
    }
    async generateAppointmentSummary(req, dto) {
        return this.aiService.generateAppointmentSummary(req.user.clinicId, dto);
    }
    async generateCampaignContent(req, dto) {
        return this.aiService.generateCampaignContent(req.user.clinicId, dto);
    }
    async analyzeXray(req, body) {
        return this.aiService.analyzeXray(req.user.clinicId, {
            attachmentId: body.attachment_id,
            notes: body.notes,
            userId: req.user.userId,
        });
    }
    async getUsageStats(req) {
        return this.aiService.getUsageStats(req.user.clinicId);
    }
    async listInsights(req, type, limit, offset) {
        return this.aiService.listInsights(req.user.clinicId, {
            type,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }
    async getInsight(req, id) {
        return this.aiService.getInsight(req.user.clinicId, id);
    }
    async deleteInsight(req, id) {
        return this.aiService.deleteInsight(req.user.clinicId, id);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('clinical-notes'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_CLINICAL_NOTES'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate SOAP clinical notes from brief dentist input' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.GenerateClinicalNotesDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateClinicalNotes", null);
__decorate([
    (0, common_1.Post)('prescription'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_PRESCRIPTION'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate AI-powered dental prescription with safety checks' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.GeneratePrescriptionDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generatePrescription", null);
__decorate([
    (0, common_1.Post)('treatment-plan'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_TREATMENT_PLAN'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate comprehensive treatment plan from dental chart' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.GenerateTreatmentPlanDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateTreatmentPlan", null);
__decorate([
    (0, common_1.Post)('revenue-insights'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_CLINICAL_NOTES'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate AI-powered revenue and performance insights' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.GenerateRevenueInsightsDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateRevenueInsights", null);
__decorate([
    (0, common_1.Post)('chart-analysis'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_TREATMENT_PLAN'),
    (0, swagger_1.ApiOperation)({ summary: 'AI risk assessment from dental chart conditions' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.GenerateChartAnalysisDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateChartAnalysis", null);
__decorate([
    (0, common_1.Post)('appointment-summary'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_CLINICAL_NOTES'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate post-visit appointment summary for handoff' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.GenerateAppointmentSummaryDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateAppointmentSummary", null);
__decorate([
    (0, common_1.Post)('campaign-content'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_CAMPAIGN_CONTENT'),
    (0, swagger_1.ApiOperation)({ summary: 'Auto-generate campaign messages with A/B variants' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.GenerateCampaignContentDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateCampaignContent", null);
__decorate([
    (0, common_1.Post)('xray-analysis'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, track_ai_usage_decorator_js_1.TrackAiUsage)(),
    (0, require_feature_decorator_js_1.RequireFeature)('AI_CLINICAL_NOTES'),
    (0, swagger_1.ApiOperation)({ summary: 'AI-powered dental X-ray analysis using vision model' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "analyzeXray", null);
__decorate([
    (0, common_1.Get)('usage'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI usage stats for the clinic with per-user and per-type breakdown' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getUsageStats", null);
__decorate([
    (0, common_1.Get)('insights'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, swagger_1.ApiOperation)({ summary: 'List stored AI insights with optional type filter' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'offset', required: false }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "listInsights", null);
__decorate([
    (0, common_1.Get)('insights/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.DENTIST),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single stored AI insight' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getInsight", null);
__decorate([
    (0, common_1.Delete)('insights/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a stored AI insight' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "deleteInsight", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('AI'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_service_js_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map