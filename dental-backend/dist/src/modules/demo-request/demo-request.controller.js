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
exports.DemoRequestController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const demo_request_service_js_1 = require("./demo-request.service.js");
const demo_request_dto_js_1 = require("./dto/demo-request.dto.js");
let DemoRequestController = class DemoRequestController {
    demoRequestService;
    constructor(demoRequestService) {
        this.demoRequestService = demoRequestService;
    }
    async create(dto) {
        const demo = await this.demoRequestService.create(dto);
        return {
            success: true,
            message: 'Demo request submitted successfully. We will contact you on WhatsApp shortly.',
            id: demo.id,
        };
    }
    async findAll(status) {
        return this.demoRequestService.findAll(status);
    }
    async findOne(id) {
        return this.demoRequestService.findOne(id);
    }
    async updateStatus(id, dto) {
        return this.demoRequestService.updateStatus(id, dto);
    }
};
exports.DemoRequestController = DemoRequestController;
__decorate([
    (0, common_1.Post)('public/demo-request'),
    (0, public_decorator_js_1.Public)(),
    (0, throttler_1.Throttle)({ strict: { ttl: 60000, limit: 3 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a demo request (public, no auth)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Demo request created, WhatsApp notifications sent.' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.CREATED }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [demo_request_dto_js_1.CreateDemoRequestDto]),
    __metadata("design:returntype", Promise)
], DemoRequestController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('super-admin/demo-requests'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all demo requests (super-admin only)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of demo requests.' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DemoRequestController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('super-admin/demo-requests/:id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a demo request by ID (super-admin only)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DemoRequestController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('super-admin/demo-requests/:id/status'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update demo request status (super-admin only)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, demo_request_dto_js_1.UpdateDemoStatusDto]),
    __metadata("design:returntype", Promise)
], DemoRequestController.prototype, "updateStatus", null);
exports.DemoRequestController = DemoRequestController = __decorate([
    (0, swagger_1.ApiTags)('Demo Requests'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [demo_request_service_js_1.DemoRequestService])
], DemoRequestController);
//# sourceMappingURL=demo-request.controller.js.map