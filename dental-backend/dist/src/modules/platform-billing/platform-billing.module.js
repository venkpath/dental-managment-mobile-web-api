"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformBillingModule = void 0;
const common_1 = require("@nestjs/common");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const platform_billing_controller_js_1 = require("./platform-billing.controller.js");
const platform_billing_super_admin_controller_js_1 = require("./platform-billing-super-admin.controller.js");
const platform_billing_service_js_1 = require("./platform-billing.service.js");
const platform_invoice_pdf_service_js_1 = require("./platform-invoice-pdf.service.js");
let PlatformBillingModule = class PlatformBillingModule {
};
exports.PlatformBillingModule = PlatformBillingModule;
exports.PlatformBillingModule = PlatformBillingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [platform_billing_controller_js_1.PlatformBillingController, platform_billing_super_admin_controller_js_1.PlatformBillingSuperAdminController],
        providers: [platform_billing_service_js_1.PlatformBillingService, platform_invoice_pdf_service_js_1.PlatformInvoicePdfService, s3_service_js_1.S3Service],
        exports: [platform_billing_service_js_1.PlatformBillingService],
    })
], PlatformBillingModule);
//# sourceMappingURL=platform-billing.module.js.map