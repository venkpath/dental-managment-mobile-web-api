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
exports.CreateInvoiceDto = exports.InvoiceItemDto = exports.InvoiceItemType = exports.InvoiceStatus = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["PENDING"] = "pending";
    InvoiceStatus["PARTIALLY_PAID"] = "partially_paid";
    InvoiceStatus["PAID"] = "paid";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var InvoiceItemType;
(function (InvoiceItemType) {
    InvoiceItemType["TREATMENT"] = "treatment";
    InvoiceItemType["SERVICE"] = "service";
    InvoiceItemType["PHARMACY"] = "pharmacy";
})(InvoiceItemType || (exports.InvoiceItemType = InvoiceItemType = {}));
class InvoiceItemDto {
    treatment_id;
    item_type;
    description;
    quantity;
    unit_price;
    static _OPENAPI_METADATA_FACTORY() {
        return { treatment_id: { required: false, type: () => String, format: "uuid" }, item_type: { required: true, enum: require("./create-invoice.dto").InvoiceItemType }, description: { required: true, type: () => String, maxLength: 500 }, quantity: { required: true, type: () => Number, minimum: 1 }, unit_price: { required: true, type: () => Number, minimum: 0 } };
    }
}
exports.InvoiceItemDto = InvoiceItemDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Treatment UUID (optional – links line item to a treatment)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], InvoiceItemDto.prototype, "treatment_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'service', enum: InvoiceItemType, description: 'Type of line item' }),
    (0, class_validator_1.IsEnum)(InvoiceItemType),
    __metadata("design:type", String)
], InvoiceItemDto.prototype, "item_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Composite restoration – Tooth #14', maxLength: 500 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], InvoiceItemDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, minimum: 1 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2500.0, description: 'Price per unit' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "unit_price", void 0);
class CreateInvoiceDto {
    branch_id;
    patient_id;
    dentist_id;
    treatment_date;
    tax_percentage;
    discount_amount;
    gst_number;
    tax_breakdown;
    as_draft;
    items;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, dentist_id: { required: false, type: () => String, format: "uuid" }, treatment_date: { required: false, type: () => String }, tax_percentage: { required: false, type: () => Number, minimum: 0 }, discount_amount: { required: false, type: () => Number, minimum: 0 }, gst_number: { required: false, type: () => String, maxLength: 20, pattern: "/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/" }, tax_breakdown: { required: false, type: () => Object }, as_draft: { required: false, type: () => Boolean }, items: { required: true, type: () => [require("./create-invoice.dto").InvoiceItemDto], minItems: 1 } };
    }
}
exports.CreateInvoiceDto = CreateInvoiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Patient UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Treating dentist (User) UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2026-01-15',
        description: 'Date the treatment was actually rendered. Use when the patient is being billed in a later month than the visit. ISO date (YYYY-MM-DD).',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "treatment_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '18%',
        description: 'Tax percentage to apply (e.g. 18 for 18% GST). 0 or omit for no tax.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "tax_percentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500.0, description: 'Flat discount amount' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "discount_amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '22AAAAA0000A1Z5',
        maxLength: 20,
        description: 'GST number (India). Format: 15-char alphanumeric.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    (0, class_validator_1.Matches)(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
        message: 'gst_number must be a valid 15-character GSTIN',
    }),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "gst_number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: { cgst: 9, sgst: 9 },
        description: 'Tax breakdown JSON (e.g. CGST/SGST split for India)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateInvoiceDto.prototype, "tax_breakdown", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: false,
        description: 'When true, the invoice is saved as a DRAFT — not visible to the patient and freely editable. Defaults to false (immediately issued).',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Type)(() => Boolean),
    __metadata("design:type", Boolean)
], CreateInvoiceDto.prototype, "as_draft", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [InvoiceItemDto], description: 'Line items for the invoice' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => InvoiceItemDto),
    __metadata("design:type", Array)
], CreateInvoiceDto.prototype, "items", void 0);
//# sourceMappingURL=create-invoice.dto.js.map