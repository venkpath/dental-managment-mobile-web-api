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
exports.AppointmentController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const appointment_service_js_1 = require("./appointment.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
let AppointmentController = class AppointmentController {
    appointmentService;
    constructor(appointmentService) {
        this.appointmentService = appointmentService;
    }
    async create(clinicId, dto) {
        return this.appointmentService.create(clinicId, dto);
    }
    async createRecurring(clinicId, dto) {
        return this.appointmentService.createRecurring(clinicId, dto);
    }
    async findAll(clinicId, query) {
        return this.appointmentService.findAll(clinicId, query);
    }
    async getAvailableSlots(clinicId, query) {
        return this.appointmentService.getAvailableSlots(clinicId, query);
    }
    async findOne(clinicId, id) {
        return this.appointmentService.findOne(clinicId, id);
    }
    async update(clinicId, id, dto) {
        return this.appointmentService.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.appointmentService.remove(clinicId, id);
    }
};
exports.AppointmentController = AppointmentController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new appointment' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Appointment created successfully' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Dentist has a time slot conflict' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateAppointmentDto]),
    __metadata("design:returntype", Promise)
], AppointmentController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('recurring'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a recurring appointment series (weekly/biweekly/monthly)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Recurring appointments created. Conflicting dates are automatically skipped.' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Invalid input or no valid dates available' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateRecurringAppointmentDto]),
    __metadata("design:returntype", Promise)
], AppointmentController.prototype, "createRecurring", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List appointments with optional filters' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of appointments' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.QueryAppointmentDto]),
    __metadata("design:returntype", Promise)
], AppointmentController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('available-slots'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available time slots for a dentist on a date (uses branch scheduling settings)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of available time slots' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.QueryAvailableSlotsDto]),
    __metadata("design:returntype", Promise)
], AppointmentController.prototype, "getAvailableSlots", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an appointment by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Appointment found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Appointment not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppointmentController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an appointment (reschedule, change status, etc.)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Appointment updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Appointment not found' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Dentist has a time slot conflict' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateAppointmentDto]),
    __metadata("design:returntype", Promise)
], AppointmentController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an appointment' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Appointment deleted successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Appointment not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppointmentController.prototype, "remove", null);
exports.AppointmentController = AppointmentController = __decorate([
    (0, swagger_1.ApiTags)('Appointments'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('appointments'),
    __metadata("design:paramtypes", [appointment_service_js_1.AppointmentService])
], AppointmentController);
//# sourceMappingURL=appointment.controller.js.map