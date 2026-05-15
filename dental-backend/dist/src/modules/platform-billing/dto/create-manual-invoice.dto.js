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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkPaidOfflineDto = exports.CancelInvoiceDto = exports.CreateManualInvoiceDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateManualInvoiceDto {
    clinic_id;
    plan_id;
    billing_cycle;
    total_amount;
    period_start;
    period_end;
    due_date;
    notes;
    send_immediately;
    static _OPENAPI_METADATA_FACTORY() {
        return { clinic_id: { required: true, type: () => String, format: "uuid" }, plan_id: { required: true, type: () => String, format: "uuid" }, billing_cycle: { required: true, type: () => Object, enum: ['monthly', 'yearly'] }, total_amount: { required: true, type: () => Number, minimum: 1 }, period_start: { required: true, type: () => Date }, period_end: { required: true, type: () => Date }, due_date: { required: false, type: () => Date }, notes: { required: false, type: () => String, maxLength: 1000 }, send_immediately: { required: false, type: () => Boolean } };
    }
}
exports.CreateManualInvoiceDto = CreateManualInvoiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Clinic the invoice is billed to' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateManualInvoiceDto.prototype, "clinic_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Plan covered by this invoice' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateManualInvoiceDto.prototype, "plan_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['monthly', 'yearly'] }),
    (0, class_validator_1.IsIn)(['monthly', 'yearly']),
    __metadata("design:type", String)
], CreateManualInvoiceDto.prototype, "billing_cycle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'GST-inclusive total in INR rupees', example: 1180 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateManualInvoiceDto.prototype, "total_amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Start of the billing period covered (ISO date)', example: '2026-06-01' }),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateManualInvoiceDto.prototype, "period_start", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'End of the billing period covered (ISO date)', example: '2026-06-30' }),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateManualInvoiceDto.prototype, "period_end", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'When payment is expected. Defaults to +7 days from period start.', example: '2026-06-07' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateManualInvoiceDto.prototype, "due_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Internal note (e.g. "Offline cheque #1234"). Not shown on PDF.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateManualInvoiceDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'If false, only create the invoice — do not generate a Pay link or send WhatsApp/Email.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateManualInvoiceDto.prototype, "send_immediately", void 0);
class CancelInvoiceDto {
    reason;
    static _OPENAPI_METADATA_FACTORY() {
        return { reason: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.CancelInvoiceDto = CancelInvoiceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reason for cancellation (appended to invoice notes).' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CancelInvoiceDto.prototype, "reason", void 0);
class MarkPaidOfflineDto {
    payment_reference;
    note;
    static _OPENAPI_METADATA_FACTORY() {
        return { payment_reference: { required: false, type: () => String, maxLength: 100 }, note: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.MarkPaidOfflineDto = MarkPaidOfflineDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cheque / UTR / cash receipt number. Stored on the invoice as `offline:<ref>`.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], MarkPaidOfflineDto.prototype, "payment_reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text note (e.g. "Cheque received from Dr Rao, deposited 2026-05-15"). Appended to invoice notes.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], MarkPaidOfflineDto.prototype, "note", void 0);
//# sourceMappingURL=create-manual-invoice.dto.js.map