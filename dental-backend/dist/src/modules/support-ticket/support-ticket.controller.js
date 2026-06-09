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
exports.SupportTicketController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const current_super_admin_decorator_js_1 = require("../../common/decorators/current-super-admin.decorator.js");
const support_ticket_service_js_1 = require("./support-ticket.service.js");
const index_js_1 = require("./dto/index.js");
let SupportTicketController = class SupportTicketController {
    service;
    constructor(service) {
        this.service = service;
    }
    async create(user, dto) {
        const ticket = await this.service.create({ userId: user.userId, clinicId: user.clinicId }, dto);
        return {
            id: ticket.id,
            status: ticket.status,
            created_at: ticket.created_at,
        };
    }
    async listMine(user) {
        return this.service.listMine({ userId: user.userId, clinicId: user.clinicId });
    }
    async getMyTicket(user, id) {
        return this.service.getTicketWithComments(id, user.clinicId);
    }
    async addUserComment(user, id, dto) {
        return this.service.addUserComment(id, user.clinicId, user.userId, dto);
    }
    async listAll(status) {
        return this.service.listAll(status);
    }
    async findOne(id) {
        return this.service.findOneWithComments(id);
    }
    async update(id, dto) {
        return this.service.update(id, dto);
    }
    async addAdminComment(admin, id, dto) {
        return this.service.addAdminComment(id, admin.name ?? 'Smart Dental Desk Support', dto);
    }
};
exports.SupportTicketController = SupportTicketController;
__decorate([
    (0, common_1.Post)('support-tickets'),
    (0, throttler_1.SkipThrottle)({ default: true }),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 5 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a support ticket' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.CREATED }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, index_js_1.CreateSupportTicketDto]),
    __metadata("design:returntype", Promise)
], SupportTicketController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('support-tickets/mine'),
    (0, swagger_1.ApiOperation)({ summary: "List the current user's submitted tickets" }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SupportTicketController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)('support-tickets/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a ticket with its full comment thread (clinic user)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SupportTicketController.prototype, "getMyTicket", null);
__decorate([
    (0, common_1.Post)('support-tickets/:id/comments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Add a reply to a support ticket (clinic user)' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.CREATED }),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, index_js_1.AddTicketCommentDto]),
    __metadata("design:returntype", Promise)
], SupportTicketController.prototype, "addUserComment", null);
__decorate([
    (0, common_1.Get)('super-admins/support-tickets'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all support tickets (super-admin)' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SupportTicketController.prototype, "listAll", null);
__decorate([
    (0, common_1.Get)('super-admins/support-tickets/:id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a support ticket by ID with comments (super-admin)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SupportTicketController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('super-admins/support-tickets/:id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update support ticket status / admin notes (super-admin)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.UpdateSupportTicketDto]),
    __metadata("design:returntype", Promise)
], SupportTicketController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('super-admins/support-tickets/:id/comments'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Post a reply on a support ticket (super-admin)' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.CREATED }),
    __param(0, (0, current_super_admin_decorator_js_1.CurrentSuperAdmin)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, index_js_1.AddTicketCommentDto]),
    __metadata("design:returntype", Promise)
], SupportTicketController.prototype, "addAdminComment", null);
exports.SupportTicketController = SupportTicketController = __decorate([
    (0, swagger_1.ApiTags)('Support Tickets'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [support_ticket_service_js_1.SupportTicketService])
], SupportTicketController);
//# sourceMappingURL=support-ticket.controller.js.map