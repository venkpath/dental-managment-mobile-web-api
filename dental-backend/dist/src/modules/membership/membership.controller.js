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
exports.MembershipController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const index_js_1 = require("./dto/index.js");
const membership_service_js_1 = require("./membership.service.js");
let MembershipController = class MembershipController {
    membershipService;
    constructor(membershipService) {
        this.membershipService = membershipService;
    }
    async createPlan(clinicId, dto) {
        return this.membershipService.createPlan(clinicId, dto);
    }
    async findAllPlans(clinicId) {
        return this.membershipService.findAllPlans(clinicId);
    }
    async updatePlan(clinicId, id, dto) {
        return this.membershipService.updatePlan(clinicId, id, dto);
    }
    async listEnrollments(clinicId, query) {
        return this.membershipService.listEnrollments(clinicId, query);
    }
    async createEnrollment(clinicId, dto) {
        return this.membershipService.createEnrollment(clinicId, dto);
    }
    async updateEnrollment(clinicId, id, dto) {
        return this.membershipService.updateEnrollment(clinicId, id, dto);
    }
    async recordUsage(clinicId, id, dto) {
        return this.membershipService.recordUsage(clinicId, id, dto);
    }
    async getPatientSummary(clinicId, patientId) {
        return this.membershipService.getPatientSummary(clinicId, patientId);
    }
};
exports.MembershipController = MembershipController;
__decorate([
    (0, common_1.Post)('plans'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a configurable patient membership plan' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Membership plan created successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateMembershipPlanDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Get)('plans'),
    (0, swagger_1.ApiOperation)({ summary: 'List membership plans for the current clinic' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Membership plans fetched successfully' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "findAllPlans", null);
__decorate([
    (0, common_1.Patch)('plans/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a membership plan and its configurable benefits' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Membership plan updated successfully' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateMembershipPlanDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Get)('enrollments'),
    (0, swagger_1.ApiOperation)({ summary: 'List membership enrollments for the current clinic' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Membership enrollments fetched successfully' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.QueryMembershipEnrollmentsDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "listEnrollments", null);
__decorate([
    (0, common_1.Post)('enrollments'),
    (0, swagger_1.ApiOperation)({ summary: 'Enroll a patient or family group into a membership plan' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Membership enrollment created successfully' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateMembershipEnrollmentDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "createEnrollment", null);
__decorate([
    (0, common_1.Patch)('enrollments/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update membership enrollment status or validity' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Membership enrollment updated successfully' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateMembershipEnrollmentDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "updateEnrollment", null);
__decorate([
    (0, common_1.Post)('enrollments/:id/usages'),
    (0, swagger_1.ApiOperation)({ summary: 'Record membership benefit usage for a covered patient' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Membership benefit usage recorded successfully' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.CreateMembershipUsageDto]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "recordUsage", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get membership summary for a patient, including family enrollments and benefit balances' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Membership summary fetched successfully' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "getPatientSummary", null);
exports.MembershipController = MembershipController = __decorate([
    (0, swagger_1.ApiTags)('Memberships'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('memberships'),
    __metadata("design:paramtypes", [membership_service_js_1.MembershipService])
], MembershipController);
//# sourceMappingURL=membership.controller.js.map