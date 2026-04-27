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
exports.PlatformBillingSuperAdminController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const super_admin_decorator_js_1 = require("../../common/decorators/super-admin.decorator.js");
const platform_billing_service_js_1 = require("./platform-billing.service.js");
class ListAllInvoicesQueryDto {
    status;
    clinic_id;
    search;
    from_date;
    to_date;
    limit;
    offset;
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ enum: ['paid', 'failed', 'refunded'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['paid', 'failed', 'refunded']),
    __metadata("design:type", String)
], ListAllInvoicesQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Filter by clinic id' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ListAllInvoicesQueryDto.prototype, "clinic_id", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Search invoice number, clinic name, email, or razorpay payment id' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListAllInvoicesQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'ISO date — issued_at >= from_date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListAllInvoicesQueryDto.prototype, "from_date", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'ISO date — issued_at <= to_date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListAllInvoicesQueryDto.prototype, "to_date", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ minimum: 1, maximum: 100, default: 25 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ListAllInvoicesQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ minimum: 0, default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ListAllInvoicesQueryDto.prototype, "offset", void 0);
let PlatformBillingSuperAdminController = class PlatformBillingSuperAdminController {
    billing;
    constructor(billing) {
        this.billing = billing;
    }
    list(query) {
        return this.billing.listAllInvoicesForSuperAdmin({
            status: query.status,
            clinicId: query.clinic_id,
            search: query.search,
            fromDate: query.from_date,
            toDate: query.to_date,
            limit: query.limit,
            offset: query.offset,
        });
    }
    get(id) {
        return this.billing.getInvoiceForSuperAdmin(id);
    }
    getPdf(id) {
        return this.billing.getInvoicePdfUrlForSuperAdmin(id);
    }
    resend(id) {
        return this.billing.resendInvoiceForSuperAdmin(id);
    }
};
exports.PlatformBillingSuperAdminController = PlatformBillingSuperAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'List subscription invoices across all clinics' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListAllInvoicesQueryDto]),
    __metadata("design:returntype", void 0)
], PlatformBillingSuperAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single platform invoice (super-admin scope)' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PlatformBillingSuperAdminController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a signed PDF download URL for any clinic\'s invoice' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PlatformBillingSuperAdminController.prototype, "getPdf", null);
__decorate([
    (0, common_1.Post)(':id/resend'),
    (0, super_admin_decorator_js_1.SuperAdmin)(),
    (0, swagger_1.ApiOperation)({ summary: 'Re-send the invoice to the clinic via WhatsApp + Email' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PlatformBillingSuperAdminController.prototype, "resend", null);
exports.PlatformBillingSuperAdminController = PlatformBillingSuperAdminController = __decorate([
    (0, swagger_1.ApiTags)('Super Admin · Platform Billing'),
    (0, common_1.Controller)('super-admins/platform-invoices'),
    __metadata("design:paramtypes", [platform_billing_service_js_1.PlatformBillingService])
], PlatformBillingSuperAdminController);
//# sourceMappingURL=platform-billing-super-admin.controller.js.map