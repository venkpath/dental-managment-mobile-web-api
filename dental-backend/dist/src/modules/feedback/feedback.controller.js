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
exports.FeedbackController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const index_js_1 = require("../user/dto/index.js");
const feedback_service_js_1 = require("./feedback.service.js");
const index_js_2 = require("./dto/index.js");
let FeedbackController = class FeedbackController {
    feedbackService;
    constructor(feedbackService) {
        this.feedbackService = feedbackService;
    }
    async create(clinicId, dto) {
        return this.feedbackService.create(clinicId, dto);
    }
    async findAll(clinicId, query) {
        return this.feedbackService.findAll(clinicId, query);
    }
    async getStats(clinicId) {
        return this.feedbackService.getStats(clinicId);
    }
};
exports.FeedbackController = FeedbackController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Record patient feedback (triggers Google review request if rating >= 4)' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_2.CreateFeedbackDto]),
    __metadata("design:returntype", Promise)
], FeedbackController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List all patient feedback' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_2.QueryFeedbackDto]),
    __metadata("design:returntype", Promise)
], FeedbackController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get feedback statistics' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FeedbackController.prototype, "getStats", null);
exports.FeedbackController = FeedbackController = __decorate([
    (0, swagger_1.ApiTags)('Patient Feedback'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('feedback'),
    __metadata("design:paramtypes", [feedback_service_js_1.FeedbackService])
], FeedbackController);
//# sourceMappingURL=feedback.controller.js.map