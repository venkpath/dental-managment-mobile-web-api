"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceModule = void 0;
const common_1 = require("@nestjs/common");
const invoice_controller_js_1 = require("./invoice.controller.js");
const invoice_service_js_1 = require("./invoice.service.js");
const invoice_pdf_service_js_1 = require("./invoice-pdf.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
let InvoiceModule = class InvoiceModule {
};
exports.InvoiceModule = InvoiceModule;
exports.InvoiceModule = InvoiceModule = __decorate([
    (0, common_1.Module)({
        controllers: [invoice_controller_js_1.InvoiceController, invoice_controller_js_1.InvoicePublicController],
        providers: [invoice_service_js_1.InvoiceService, invoice_pdf_service_js_1.InvoicePdfService, s3_service_js_1.S3Service],
        exports: [invoice_service_js_1.InvoiceService],
    })
], InvoiceModule);
//# sourceMappingURL=invoice.module.js.map