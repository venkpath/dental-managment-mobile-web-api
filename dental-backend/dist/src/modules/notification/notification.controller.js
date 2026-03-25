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
exports.NotificationController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notification_service_js_1 = require("./notification.service.js");
const notification_cron_js_1 = require("./notification.cron.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const index_js_2 = require("../user/dto/index.js");
let NotificationController = class NotificationController {
    notificationService;
    cronService;
    constructor(notificationService, cronService) {
        this.notificationService = notificationService;
        this.cronService = cronService;
    }
    async triggerCrons() {
        const results = {};
        try {
            await this.cronService.appointmentReminders();
            results['appointment_reminders'] = 'ok';
        }
        catch (e) {
            results['appointment_reminders'] = `error: ${e.message}`;
        }
        try {
            await this.cronService.paymentOverdueAlerts();
            results['payment_overdue'] = 'ok';
        }
        catch (e) {
            results['payment_overdue'] = `error: ${e.message}`;
        }
        try {
            await this.cronService.lowInventoryAlerts();
            results['low_inventory'] = 'ok';
        }
        catch (e) {
            results['low_inventory'] = `error: ${e.message}`;
        }
        return { message: 'Cron jobs triggered', results };
    }
    async triggerSingleCron(jobName) {
        const jobMap = {
            appointmentReminders: () => this.cronService.appointmentReminders(),
            paymentOverdueAlerts: () => this.cronService.paymentOverdueAlerts(),
            lowInventoryAlerts: () => this.cronService.lowInventoryAlerts(),
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
    async findAll(clinicId, user, query) {
        return this.notificationService.findByClinicAndUser(clinicId, user.sub, query);
    }
    async unreadCount(clinicId, user) {
        const count = await this.notificationService.getUnreadCount(clinicId, user.sub);
        return { count };
    }
    async markAllRead(clinicId, user) {
        const count = await this.notificationService.markAllAsRead(clinicId, user.sub);
        return { count };
    }
    async markRead(clinicId, id) {
        return this.notificationService.markAsRead(clinicId, id);
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Post)('trigger-crons'),
    (0, roles_decorator_js_1.Roles)(index_js_2.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger all notification cron jobs (Admin only, for testing)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Cron jobs executed' }),
    openapi.ApiResponse({ status: 201 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "triggerCrons", null);
__decorate([
    (0, common_1.Post)('trigger/:jobName'),
    (0, roles_decorator_js_1.Roles)(index_js_2.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger a single notification cron job by name' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Cron job executed' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('jobName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "triggerSingleCron", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List notifications for the current user' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Paginated list of notifications' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, index_js_1.QueryNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unread notification count' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Unread count' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "unreadCount", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all notifications as read' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Number of notifications marked as read' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllRead", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark a notification as read' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Updated notification' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Notification not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markRead", null);
exports.NotificationController = NotificationController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notification_service_js_1.NotificationService,
        notification_cron_js_1.NotificationCronService])
], NotificationController);
//# sourceMappingURL=notification.controller.js.map