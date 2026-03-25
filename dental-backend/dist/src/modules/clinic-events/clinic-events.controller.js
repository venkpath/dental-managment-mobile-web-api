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
exports.ClinicEventsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const index_js_1 = require("../user/dto/index.js");
const clinic_events_service_js_1 = require("./clinic-events.service.js");
const index_js_2 = require("./dto/index.js");
let ClinicEventsController = class ClinicEventsController {
    eventsService;
    constructor(eventsService) {
        this.eventsService = eventsService;
    }
    async findAll(clinicId) {
        return this.eventsService.findAll(clinicId);
    }
    async getUpcoming(clinicId, days) {
        return this.eventsService.getUpcoming(clinicId, days ? parseInt(days, 10) : 30);
    }
    async create(clinicId, dto) {
        return this.eventsService.create(clinicId, dto);
    }
    async update(clinicId, id, dto) {
        return this.eventsService.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.eventsService.remove(clinicId, id);
    }
};
exports.ClinicEventsController = ClinicEventsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all events (system festivals + clinic-specific)' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClinicEventsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('upcoming'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get upcoming events in the next N days' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClinicEventsController.prototype, "getUpcoming", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a clinic-specific event' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_2.CreateClinicEventDto]),
    __metadata("design:returntype", Promise)
], ClinicEventsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update an event (system events get cloned for clinic)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_2.UpdateClinicEventDto]),
    __metadata("design:returntype", Promise)
], ClinicEventsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a clinic-specific event' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClinicEventsController.prototype, "remove", null);
exports.ClinicEventsController = ClinicEventsController = __decorate([
    (0, swagger_1.ApiTags)('Clinic Events'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('clinic-events'),
    __metadata("design:paramtypes", [clinic_events_service_js_1.ClinicEventsService])
], ClinicEventsController);
//# sourceMappingURL=clinic-events.controller.js.map