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
exports.AutomationController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
const index_js_1 = require("../user/dto/index.js");
const automation_service_js_1 = require("./automation.service.js");
const automation_cron_js_1 = require("./automation.cron.js");
const index_js_2 = require("./dto/index.js");
let AutomationController = class AutomationController {
    automationService;
    automationCronService;
    constructor(automationService, automationCronService) {
        this.automationService = automationService;
        this.automationCronService = automationCronService;
    }
    async getAllRules(clinicId) {
        return this.automationService.getAllRules(clinicId);
    }
    async getRule(clinicId, ruleType) {
        return this.automationService.getRule(clinicId, ruleType);
    }
    async upsertRule(clinicId, ruleType, dto) {
        return this.automationService.upsertRule(clinicId, ruleType, dto);
    }
    async triggerCrons() {
        const results = {};
        const jobs = [
            { name: 'birthdayGreetings', fn: () => this.automationCronService.birthdayGreetings() },
            { name: 'festivalGreetings', fn: () => this.automationCronService.festivalGreetings() },
            { name: 'appointmentRemindersToPatients', fn: () => this.automationCronService.appointmentRemindersToPatients() },
            { name: 'paymentReminders', fn: () => this.automationCronService.paymentReminders() },
            { name: 'dormantPatientDetection', fn: () => this.automationCronService.dormantPatientDetection() },
            { name: 'treatmentPlanReminders', fn: () => this.automationCronService.treatmentPlanReminders() },
        ];
        for (const job of jobs) {
            try {
                await job.fn();
                results[job.name] = 'success';
            }
            catch (e) {
                results[job.name] = `error: ${e.message}`;
            }
        }
        return { message: 'Automation crons triggered manually', results };
    }
    async triggerSingleCron(jobName) {
        const jobMap = {
            birthdayGreetings: () => this.automationCronService.birthdayGreetings(),
            festivalGreetings: () => this.automationCronService.festivalGreetings(),
            appointmentRemindersToPatients: () => this.automationCronService.appointmentRemindersToPatients(),
            paymentReminders: () => this.automationCronService.paymentReminders(),
            dormantPatientDetection: () => this.automationCronService.dormantPatientDetection(),
            treatmentPlanReminders: () => this.automationCronService.treatmentPlanReminders(),
        };
        const fn = jobMap[jobName];
        if (!fn) {
            throw new (await import('@nestjs/common')).BadRequestException(`Unknown job: ${jobName}. Valid jobs: ${Object.keys(jobMap).join(', ')}`);
        }
        try {
            await fn();
            return { job: jobName, status: 'success' };
        }
        catch (e) {
            return { job: jobName, status: 'error', error: e.message };
        }
    }
};
exports.AutomationController = AutomationController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all automation rules for the clinic (creates defaults on first access)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of automation rules with enable/disable status and config' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "getAllRules", null);
__decorate([
    (0, common_1.Get)(':ruleType'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific automation rule' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('ruleType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "getRule", null);
__decorate([
    (0, common_1.Patch)(':ruleType'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Enable/disable or configure an automation rule' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('ruleType')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_2.UpsertAutomationRuleDto]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "upsertRule", null);
__decorate([
    (0, common_1.Post)('trigger-crons'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger all automation crons (birthday, festival, appointment, payment, dormant, treatment)' }),
    openapi.ApiResponse({ status: 201 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "triggerCrons", null);
__decorate([
    (0, common_1.Post)('trigger/:jobName'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger a single automation cron job by name' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('jobName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutomationController.prototype, "triggerSingleCron", null);
exports.AutomationController = AutomationController = __decorate([
    (0, swagger_1.ApiTags)('Automation Rules'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('AUTOMATION_RULES'),
    (0, common_1.Controller)('automation/rules'),
    __metadata("design:paramtypes", [automation_service_js_1.AutomationService,
        automation_cron_js_1.AutomationCronService])
], AutomationController);
//# sourceMappingURL=automation.controller.js.map