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
exports.RoomController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const room_service_js_1 = require("./room.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
let RoomController = class RoomController {
    roomService;
    constructor(roomService) {
        this.roomService = roomService;
    }
    async findAll(clinicId, branchId) {
        return this.roomService.findAll(clinicId, branchId);
    }
    async findOne(clinicId, id) {
        return this.roomService.findOne(clinicId, id);
    }
    async create(clinicId, dto) {
        return this.roomService.create(clinicId, dto.branch_id, dto);
    }
    async update(clinicId, id, dto) {
        return this.roomService.update(clinicId, id, dto);
    }
    async setStatus(clinicId, id, dto) {
        return this.roomService.setStatus(clinicId, id, dto);
    }
    async assign(clinicId, id, dto) {
        return this.roomService.assignAppointment(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.roomService.remove(clinicId, id);
    }
};
exports.RoomController = RoomController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all active rooms for the clinic (optionally filtered by branch)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of rooms with today\'s appointment data' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('branch_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoomController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single room by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Room found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Room not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoomController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new room (branch_id required in body)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Room created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateRoomDto]),
    __metadata("design:returntype", Promise)
], RoomController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update room details (name, type, notes, order)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Room updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateRoomDto]),
    __metadata("design:returntype", Promise)
], RoomController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Quick-change room status (available | occupied | cleaning | maintenance | reserved)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Room status updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateRoomStatusDto]),
    __metadata("design:returntype", Promise)
], RoomController.prototype, "setStatus", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign (or un-assign) an appointment to a room; room flips to occupied' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Appointment assigned to room' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.AssignRoomDto]),
    __metadata("design:returntype", Promise)
], RoomController.prototype, "assign", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN, create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a room (only if not currently occupied)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Room deleted' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoomController.prototype, "remove", null);
exports.RoomController = RoomController = __decorate([
    (0, swagger_1.ApiTags)('Rooms'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('rooms'),
    __metadata("design:paramtypes", [room_service_js_1.RoomService])
], RoomController);
//# sourceMappingURL=room.controller.js.map