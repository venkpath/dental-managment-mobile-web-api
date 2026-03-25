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
exports.InvoiceController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const invoice_service_js_1 = require("./invoice.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
let InvoiceController = class InvoiceController {
    invoiceService;
    constructor(invoiceService) {
        this.invoiceService = invoiceService;
    }
    async createInvoice(clinicId, dto) {
        return this.invoiceService.create(clinicId, dto);
    }
    async findAll(clinicId, query) {
        return this.invoiceService.findAll(clinicId, query);
    }
    async findOne(clinicId, id) {
        return this.invoiceService.findOne(clinicId, id);
    }
    async createPayment(clinicId, dto) {
        return this.invoiceService.addPayment(clinicId, dto);
    }
    async createInstallmentPlan(clinicId, id, dto) {
        dto.invoice_id = id;
        return this.invoiceService.createInstallmentPlan(clinicId, dto);
    }
    async deleteInstallmentPlan(clinicId, id) {
        return this.invoiceService.deleteInstallmentPlan(clinicId, id);
    }
};
exports.InvoiceController = InvoiceController;
__decorate([
    (0, common_1.Post)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'Create an invoice with line items' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Invoice created successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateInvoiceDto]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'List invoices with optional filters' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of invoices' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.QueryInvoiceDto]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an invoice by ID with items and payments' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Invoice found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Invoice not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('payments'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a payment against an invoice (supports installments)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Payment recorded successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Invoice not found' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Invoice already paid or amount exceeds balance' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreatePaymentDto]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Post)('invoices/:id/installment-plan'),
    (0, swagger_1.ApiOperation)({ summary: 'Create an installment plan for an invoice' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Installment plan created' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Invoice not found' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Plan already exists or total mismatch' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.CreateInstallmentPlanDto]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "createInstallmentPlan", null);
__decorate([
    (0, common_1.Delete)('invoices/:id/installment-plan'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an installment plan (only if no payments made against it)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Installment plan deleted' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "deleteInstallmentPlan", null);
exports.InvoiceController = InvoiceController = __decorate([
    (0, swagger_1.ApiTags)('Invoices & Payments'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [invoice_service_js_1.InvoiceService])
], InvoiceController);
//# sourceMappingURL=invoice.controller.js.map