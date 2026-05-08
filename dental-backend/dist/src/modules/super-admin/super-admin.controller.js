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
var SuperAdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const current_super_admin_decorator_js_1 = require("../../common/decorators/current-super-admin.decorator.js");
const super_admin_service_js_1 = require("./super-admin.service.js");
const super_admin_auth_service_js_1 = require("./super-admin-auth.service.js");
const super_admin_whatsapp_service_js_1 = require("./super-admin-whatsapp.service.js");
const daily_summary_cron_js_1 = require("../reports/daily-summary.cron.js");
const index_js_1 = require("./dto/index.js");
const clinic_service_js_1 = require("../clinic/clinic.service.js");
const index_js_2 = require("../clinic/dto/index.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const automation_service_js_1 = require("../automation/automation.service.js");
const branch_service_js_1 = require("../branch/branch.service.js");
const ai_usage_service_js_1 = require("../ai/ai-usage.service.js");
const update_clinic_settings_dto_js_1 = require("../communication/dto/update-clinic-settings.dto.js");
const upsert_automation_rule_dto_js_1 = require("../automation/dto/upsert-automation-rule.dto.js");
const create_branch_dto_js_1 = require("../branch/dto/create-branch.dto.js");
const update_branch_dto_js_1 = require("../branch/dto/update-branch.dto.js");
const update_branch_scheduling_dto_js_1 = require("../branch/dto/update-branch-scheduling.dto.js");
let SuperAdminController = SuperAdminController_1 = class SuperAdminController {
    superAdminService;
    superAdminAuthService;
    clinicService;
    communicationService;
    automationService;
    branchService;
    whatsAppService;
    aiUsageService;
    dailySummaryCron;
    logger = new common_1.Logger(SuperAdminController_1.name);
    constructor(superAdminService, superAdminAuthService, clinicService, communicationService, automationService, branchService, whatsAppService, aiUsageService, dailySummaryCron) {
        this.superAdminService = superAdminService;
        this.superAdminAuthService = superAdminAuthService;
        this.clinicService = clinicService;
        this.communicationService = communicationService;
        this.automationService = automationService;
        this.branchService = branchService;
        this.whatsAppService = whatsAppService;
        this.aiUsageService = aiUsageService;
        this.dailySummaryCron = dailySummaryCron;
    }
    async login(dto) {
        return this.superAdminAuthService.login(dto);
    }
    async create(dto) {
        return this.superAdminService.create(dto);
    }
    async getProfile(admin) {
        return this.superAdminService.findOne(admin.id);
    }
    async getDashboardStats() {
        return this.superAdminService.getDashboardStats();
    }
    async listClinics(status, search, page, limit) {
        return this.superAdminService.listClinics({
            status,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
    async getClinicDetail(id) {
        return this.superAdminService.getClinicDetail(id);
    }
    async updateSubscription(id, dto) {
        return this.clinicService.updateSubscription(id, dto);
    }
    async onboardClinic(dto) {
        return this.superAdminService.onboardClinic(dto);
    }
    async deleteClinic(id) {
        return this.superAdminService.deleteClinic(id);
    }
    async updateClinicLimits(id, dto) {
        return this.superAdminService.updateClinicLimits(id, dto);
    }
    async changePassword(admin, dto) {
        return this.superAdminService.changePassword(admin.id, dto.current_password, dto.new_password);
    }
    async triggerDailySummary(body) {
        const channels = body?.channels?.length ? body.channels : ['email', 'whatsapp'];
        this.dailySummaryCron.sendDailySummaries(channels).catch((e) => this.logger.error(`Daily summary trigger failed: ${e.message}`));
        return { message: `Daily summary dispatch started (${channels.join(' + ')}). Check server logs for delivery status.` };
    }
    async listMessages(channel, status, clinicId, from, toDate, page = 1, limit = 50) {
        return this.superAdminService.listMessages({ channel, status, clinicId, from, toDate, page, limit });
    }
    async messageStats(channel, from, toDate) {
        return this.superAdminService.messageStats({ channel, from, toDate });
    }
    async getAuditLogs(page, limit, clinicId, action) {
        return this.superAdminService.getAuditLogs({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 50,
            clinicId,
            action,
        });
    }
    async impersonateClinic(id) {
        return this.superAdminAuthService.impersonate(id);
    }
    async getClinicCommunicationSettings(id) {
        return this.communicationService.getClinicSettings(id);
    }
    async getClinicUsage(id) {
        return this.communicationService.getUsage(id);
    }
    async updateClinicCommunicationSettings(id, dto) {
        return this.communicationService.updateClinicSettings(id, dto, { skipFeatureCheck: true });
    }
    async getClinicAutomationRules(id) {
        return this.automationService.getAllRules(id);
    }
    async updateClinicAutomationRule(id, ruleType, dto) {
        return this.automationService.upsertRule(id, ruleType, dto);
    }
    async getClinicBranches(id) {
        return this.branchService.findAll(id);
    }
    async createClinicBranch(id, dto) {
        return this.branchService.create(id, dto);
    }
    async updateClinicBranch(id, branchId, dto) {
        return this.branchService.update(id, branchId, dto);
    }
    async getClinicBranchScheduling(id, branchId) {
        return this.branchService.getSchedulingSettings(id, branchId);
    }
    async updateClinicBranchScheduling(id, branchId, dto) {
        return this.branchService.updateSchedulingSettings(id, branchId, dto);
    }
    async getGlobalSettings() {
        return this.superAdminService.getGlobalSettings();
    }
    async updateGlobalSetting(key, body) {
        return this.superAdminService.updateGlobalSetting(key, body.value);
    }
    async updateClinicAiQuota(id, body) {
        return this.superAdminService.updateClinicAiQuota(id, body.quota);
    }
    async resetClinicAiUsage(id) {
        return this.superAdminService.resetClinicAiUsage(id);
    }
    getWhatsAppStatus() {
        return this.whatsAppService.getStatus();
    }
    listConversations(page, limit) {
        return this.whatsAppService.getConversations(page ? Number(page) : 1, limit ? Number(limit) : 30);
    }
    getConversationMessages(phone, page, limit) {
        return this.whatsAppService.getConversationMessages(phone, page ? Number(page) : 1, limit ? Number(limit) : 50);
    }
    sendReply(phone, body) {
        return this.whatsAppService.sendReply(phone, body.message);
    }
    sendTemplate(body) {
        return this.whatsAppService.sendTemplate({
            phone: body.phone,
            templateName: body.template_name,
            languageCode: body.language_code,
            bodyParams: body.body_params,
            contactName: body.contact_name,
        });
    }
    async listAiApprovalRequests(status) {
        return this.aiUsageService.listApprovalRequests({ status });
    }
    async decideAiApprovalRequest(admin, id, body) {
        return this.aiUsageService.decideApprovalRequest({
            requestId: id,
            superAdminId: admin.id,
            status: body.status,
            approvedAmount: body.approved_amount,
            note: body.note,
        });
    }
    async listOverageCharges(status) {
        return this.aiUsageService.listOverageCharges({ status });
    }
    async markOverageChargePaid(admin, id, body) {
        return this.aiUsageService.markChargePaid({
            chargeId: id,
            superAdminId: admin.id,
            paymentReference: body.payment_reference || '',
            note: body.note,
        });
    }
    async waiveOverageCharge(admin, id, body) {
        return this.aiUsageService.waiveCharge({
            chargeId: id,
            superAdminId: admin.id,
            note: body.note,
        });
    }
};
exports.SuperAdminController = SuperAdminController;
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.Post)('auth/super-admin/login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Super admin login' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Login successful' }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Too many login attempts' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.LoginSuperAdminDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('super-admins'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new super admin' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Super admin created successfully' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Email already exists' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.CreateSuperAdminDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('super-admins/me'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current super admin profile' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Super admin profile' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_super_admin_decorator_js_1.CurrentSuperAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('super-admins/dashboard/stats'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform dashboard statistics' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('super-admins/clinics'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all clinics with pagination, filtering, and search' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "listClinics", null);
__decorate([
    (0, common_1.Get)('super-admins/clinics/:id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed clinic info (users, branches, stats)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getClinicDetail", null);
__decorate([
    (0, common_1.Patch)('super-admins/clinics/:id/subscription'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update clinic subscription (plan, status, trial)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_2.UpdateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Post)('super-admins/clinics/onboard'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Manually onboard a new clinic with admin user' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Clinic onboarded successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.OnboardClinicDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "onboardClinic", null);
__decorate([
    (0, common_1.Delete)('super-admins/clinics/:id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a clinic and all its data' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Clinic deleted successfully' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "deleteClinic", null);
__decorate([
    (0, common_1.Patch)('super-admins/clinics/:id/limits'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Set per-clinic monthly usage limit overrides (null resets to plan default)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Clinic limits updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.UpdateClinicLimitsDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateClinicLimits", null);
__decorate([
    (0, common_1.Patch)('super-admins/me/password'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Change super admin password' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Password changed successfully' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_super_admin_decorator_js_1.CurrentSuperAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('super-admins/daily-summary/trigger'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger daily summary emails/WhatsApp (for testing)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Daily summary dispatch started' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "triggerDailySummary", null);
__decorate([
    (0, common_1.Get)('super-admins/messages'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all outbound messages across all clinics (filterable)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('channel')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('clinic_id')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to_date')),
    __param(5, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(6, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "listMessages", null);
__decorate([
    (0, common_1.Get)('super-admins/messages/stats'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Aggregated message stats across all clinics' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('channel')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to_date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "messageStats", null);
__decorate([
    (0, common_1.Get)('super-admins/audit-logs'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform-wide audit logs' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('clinic_id')),
    __param(3, (0, common_1.Query)('action')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Post)('super-admins/clinics/:id/impersonate'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate a token to impersonate a clinic admin' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Impersonation token' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "impersonateClinic", null);
__decorate([
    (0, common_1.Get)('super-admins/clinics/:id/communication-settings'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get communication settings for a clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getClinicCommunicationSettings", null);
__decorate([
    (0, common_1.Get)('super-admins/clinics/:id/usage'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current month usage counters and quota status for a clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getClinicUsage", null);
__decorate([
    (0, common_1.Patch)('super-admins/clinics/:id/communication-settings'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update communication settings for a clinic (bypasses feature gate)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_clinic_settings_dto_js_1.UpdateClinicSettingsDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateClinicCommunicationSettings", null);
__decorate([
    (0, common_1.Get)('super-admins/clinics/:id/automation-rules'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all automation rules for a clinic' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getClinicAutomationRules", null);
__decorate([
    (0, common_1.Patch)('super-admins/clinics/:id/automation-rules/:ruleType'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update an automation rule for a clinic' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('ruleType')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, upsert_automation_rule_dto_js_1.UpsertAutomationRuleDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateClinicAutomationRule", null);
__decorate([
    (0, common_1.Get)('super-admins/clinics/:id/branches'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all branches for a clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getClinicBranches", null);
__decorate([
    (0, common_1.Post)('super-admins/clinics/:id/branches'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new branch for a clinic' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_branch_dto_js_1.CreateBranchDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "createClinicBranch", null);
__decorate([
    (0, common_1.Patch)('super-admins/clinics/:id/branches/:branchId'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a branch for a clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_branch_dto_js_1.UpdateBranchDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateClinicBranch", null);
__decorate([
    (0, common_1.Get)('super-admins/clinics/:id/branches/:branchId/scheduling'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get scheduling settings for a branch' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getClinicBranchScheduling", null);
__decorate([
    (0, common_1.Patch)('super-admins/clinics/:id/branches/:branchId/scheduling'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update scheduling settings for a branch' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_branch_scheduling_dto_js_1.UpdateBranchSchedulingDto]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateClinicBranchScheduling", null);
__decorate([
    (0, common_1.Get)('super-admins/global-settings'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all global settings (key-value pairs)' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getGlobalSettings", null);
__decorate([
    (0, common_1.Patch)('super-admins/global-settings/:key'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a global setting' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateGlobalSetting", null);
__decorate([
    (0, common_1.Patch)('super-admins/clinics/:id/ai-quota'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Set per-clinic AI quota override (null to use global/default)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "updateClinicAiQuota", null);
__decorate([
    (0, common_1.Post)('super-admins/clinics/:id/ai-usage/reset'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reset AI usage counter for a clinic' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "resetClinicAiUsage", null);
__decorate([
    (0, common_1.Get)('super-admins/whatsapp/status'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform WhatsApp connection status (env-configured)' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getWhatsAppStatus", null);
__decorate([
    (0, common_1.Get)('super-admins/whatsapp/inbox'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List platform WhatsApp conversations (grouped by contact phone)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Get)('super-admins/whatsapp/inbox/:phone'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get messages in a platform WhatsApp conversation thread' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('phone')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "getConversationMessages", null);
__decorate([
    (0, common_1.Post)('super-admins/whatsapp/inbox/:phone/reply'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Send a free-form reply within 24hr session window' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('phone')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "sendReply", null);
__decorate([
    (0, common_1.Post)('super-admins/whatsapp/inbox/send-template'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Send a template message to start a new platform conversation' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SuperAdminController.prototype, "sendTemplate", null);
__decorate([
    (0, common_1.Get)('super-admins/ai/approval-requests'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List AI quota approval requests across clinics' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "listAiApprovalRequests", null);
__decorate([
    (0, common_1.Post)('super-admins/ai/approval-requests/:id/decide'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject an AI quota approval request' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_super_admin_decorator_js_1.CurrentSuperAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "decideAiApprovalRequest", null);
__decorate([
    (0, common_1.Get)('super-admins/ai/overage-charges'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List AI overage charges across clinics' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "listOverageCharges", null);
__decorate([
    (0, common_1.Post)('super-admins/ai/overage-charges/:id/mark-paid'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Manually mark an AI overage charge as paid (offline payment)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_super_admin_decorator_js_1.CurrentSuperAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "markOverageChargePaid", null);
__decorate([
    (0, common_1.Post)('super-admins/ai/overage-charges/:id/waive'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Waive an AI overage charge' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_super_admin_decorator_js_1.CurrentSuperAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "waiveOverageCharge", null);
exports.SuperAdminController = SuperAdminController = SuperAdminController_1 = __decorate([
    (0, swagger_1.ApiTags)('Super Admin'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [super_admin_service_js_1.SuperAdminService,
        super_admin_auth_service_js_1.SuperAdminAuthService,
        clinic_service_js_1.ClinicService,
        communication_service_js_1.CommunicationService,
        automation_service_js_1.AutomationService,
        branch_service_js_1.BranchService,
        super_admin_whatsapp_service_js_1.SuperAdminWhatsAppService,
        ai_usage_service_js_1.AiUsageService,
        daily_summary_cron_js_1.DailySummaryCronService])
], SuperAdminController);
//# sourceMappingURL=super-admin.controller.js.map