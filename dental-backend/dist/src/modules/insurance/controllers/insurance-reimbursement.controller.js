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
exports.InsuranceReimbursementController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_clinic_decorator_js_1 = require("../../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../../common/decorators/current-user.decorator.js");
const require_clinic_guard_js_1 = require("../../../common/guards/require-clinic.guard.js");
const require_feature_decorator_js_1 = require("../../../common/decorators/require-feature.decorator.js");
const roles_decorator_js_1 = require("../../../common/decorators/roles.decorator.js");
const index_js_1 = require("../../user/dto/index.js");
const insurance_reimbursement_service_js_1 = require("../services/insurance-reimbursement.service.js");
const create_claim_dto_js_1 = require("../dto/create-claim.dto.js");
let InsuranceReimbursementController = class InsuranceReimbursementController {
    reimbursementService;
    constructor(reimbursementService) {
        this.reimbursementService = reimbursementService;
    }
    findAll(clinicId, from, to, skip, take) {
        return this.reimbursementService.findAll(clinicId, { from, to, skip, take });
    }
    findOne(clinicId, id) {
        return this.reimbursementService.findOne(id, clinicId);
    }
    create(clinicId, user, dto) {
        return this.reimbursementService.create(clinicId, dto, user.sub);
    }
};
exports.InsuranceReimbursementController = InsuranceReimbursementController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('skip', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('take', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], InsuranceReimbursementController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InsuranceReimbursementController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)(index_js_1.UserRole.SUPER_ADMIN, index_js_1.UserRole.ADMIN),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_claim_dto_js_1.CreateReimbursementDto]),
    __metadata("design:returntype", void 0)
], InsuranceReimbursementController.prototype, "create", null);
exports.InsuranceReimbursementController = InsuranceReimbursementController = __decorate([
    (0, swagger_1.ApiTags)('Insurance — Reimbursements'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, require_feature_decorator_js_1.RequireFeature)('INSURANCE_MODULE'),
    (0, common_1.Controller)('insurance/reimbursements'),
    __metadata("design:paramtypes", [insurance_reimbursement_service_js_1.InsuranceReimbursementService])
], InsuranceReimbursementController);
//# sourceMappingURL=insurance-reimbursement.controller.js.map