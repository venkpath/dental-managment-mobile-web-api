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
exports.PlatformBillingController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_billing_service_js_1 = require("./platform-billing.service.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
const list_invoices_query_dto_js_1 = require("./dto/list-invoices-query.dto.js");
let PlatformBillingController = class PlatformBillingController {
    billing;
    constructor(billing) {
        this.billing = billing;
    }
    list(req, query) {
        return this.billing.listInvoicesForClinic(req.user.clinicId, query);
    }
    outstanding(req) {
        return this.billing.listOutstandingInvoices(req.user.clinicId);
    }
    get(req, id) {
        return this.billing.getInvoice(req.user.clinicId, id);
    }
    getPdf(req, id) {
        return this.billing.getInvoicePdfUrl(req.user.clinicId, id);
    }
    payLink(req, id) {
        return this.billing.getPaymentLinkForClinic(req.user.clinicId, id);
    }
    resend(req, id) {
        return this.billing.resendInvoice(req.user.clinicId, id);
    }
};
exports.PlatformBillingController = PlatformBillingController;
__decorate([
    (0, common_1.Get)('invoices'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List subscription invoices issued to this clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_invoices_query_dto_js_1.ListPlatformInvoicesQueryDto]),
    __metadata("design:returntype", void 0)
], PlatformBillingController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('invoices/outstanding'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List unpaid (due + overdue) invoices for the current clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PlatformBillingController.prototype, "outstanding", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single platform invoice with full breakup' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PlatformBillingController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('invoices/:id/pdf'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get a signed download URL for the invoice PDF' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PlatformBillingController.prototype, "getPdf", null);
__decorate([
    (0, common_1.Get)('invoices/:id/pay-link'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get the Razorpay-hosted Pay link for a due invoice (regenerated if missing)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PlatformBillingController.prototype, "payLink", null);
__decorate([
    (0, common_1.Post)('invoices/:id/resend'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Re-send the invoice via WhatsApp + Email' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PlatformBillingController.prototype, "resend", null);
exports.PlatformBillingController = PlatformBillingController = __decorate([
    (0, swagger_1.ApiTags)('Platform Billing'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('platform-billing'),
    __metadata("design:paramtypes", [platform_billing_service_js_1.PlatformBillingService])
], PlatformBillingController);
//# sourceMappingURL=platform-billing.controller.js.map