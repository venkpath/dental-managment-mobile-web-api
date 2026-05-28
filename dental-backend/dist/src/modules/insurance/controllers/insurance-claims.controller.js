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
exports.InsuranceClaimsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_clinic_decorator_js_1 = require("../../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../../common/decorators/current-user.decorator.js");
const require_clinic_guard_js_1 = require("../../../common/guards/require-clinic.guard.js");
const require_feature_decorator_js_1 = require("../../../common/decorators/require-feature.decorator.js");
const roles_decorator_js_1 = require("../../../common/decorators/roles.decorator.js");
const index_js_1 = require("../../user/dto/index.js");
const insurance_claims_service_js_1 = require("../services/insurance-claims.service.js");
const create_claim_dto_js_1 = require("../dto/create-claim.dto.js");
let InsuranceClaimsController = class InsuranceClaimsController {
    claimsService;
    constructor(claimsService) {
        this.claimsService = claimsService;
    }
    findAll(clinicId, status, patient_id, provider_id, from, to, skip, take) {
        return this.claimsService.findAll(clinicId, { status, patient_id, provider_id, from, to, skip, take });
    }
    getStats(clinicId) {
        return this.claimsService.getStats(clinicId);
    }
    getMonthlyReceived(clinicId) {
        return this.claimsService.getMonthlyReceived(clinicId);
    }
    findByInvoice(clinicId, invoiceId) {
        return this.claimsService.findByInvoice(invoiceId, clinicId);
    }
    findOne(clinicId, id) {
        return this.claimsService.findOne(id, clinicId);
    }
    submit(clinicId, user, id, dto) {
        return this.claimsService.submit(id, clinicId, dto, user.sub);
    }
    updateStatus(clinicId, user, id, dto) {
        return this.claimsService.updateStatus(id, clinicId, dto, user.sub);
    }
    recordPayment(clinicId, user, id, dto) {
        return this.claimsService.recordPayment(id, clinicId, dto, user.sub);
    }
};
exports.InsuranceClaimsController = InsuranceClaimsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('patient_id')),
    __param(3, (0, common_1.Query)('provider_id')),
    __param(4, (0, common_1.Query)('from')),
    __param(5, (0, common_1.Query)('to')),
    __param(6, (0, common_1.Query)('skip', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(7, (0, common_1.Query)('take', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], InsuranceClaimsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InsuranceClaimsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('monthly-received'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InsuranceClaimsController.prototype, "getMonthlyReceived", null);
__decorate([
    (0, common_1.Get)('by-invoice/:invoiceId'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST, index_js_1.UserRole.DENTIST, index_js_1.UserRole.CONSULTANT),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InsuranceClaimsController.prototype, "findByInvoice", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST, index_js_1.UserRole.DENTIST, index_js_1.UserRole.CONSULTANT),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InsuranceClaimsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN, index_js_1.UserRole.RECEPTIONIST),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, create_claim_dto_js_1.SubmitClaimDto]),
    __metadata("design:returntype", void 0)
], InsuranceClaimsController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/status'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, create_claim_dto_js_1.UpdateClaimStatusDto]),
    __metadata("design:returntype", void 0)
], InsuranceClaimsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/payment'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, create_claim_dto_js_1.RecordClaimPaymentDto]),
    __metadata("design:returntype", void 0)
], InsuranceClaimsController.prototype, "recordPayment", null);
exports.InsuranceClaimsController = InsuranceClaimsController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Claims'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, common_1.Controller)('insurance/claims'),
    __metadata("design:paramtypes", [insurance_claims_service_js_1.InsuranceClaimsService])
], InsuranceClaimsController);
//# sourceMappingURL=insurance-claims.controller.js.map