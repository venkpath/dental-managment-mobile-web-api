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
exports.CreateExpenseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateExpenseDto {
    branch_id;
    category_id;
    title;
    amount;
    date;
    payment_mode;
    vendor;
    receipt_url;
    notes;
    is_recurring;
    recurring_frequency;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: false, type: () => String, format: "uuid" }, category_id: { required: true, type: () => String, format: "uuid" }, title: { required: true, type: () => String, maxLength: 255 }, amount: { required: true, type: () => Number, minimum: 0.01 }, date: { required: true, type: () => String }, payment_mode: { required: false, type: () => String, enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque'] }, vendor: { required: false, type: () => String, maxLength: 255 }, receipt_url: { required: false, type: () => String, maxLength: 1000 }, notes: { required: false, type: () => String }, is_recurring: { required: false, type: () => Boolean }, recurring_frequency: { required: false, type: () => String, enum: ['monthly', 'quarterly', 'yearly'] } };
    }
}
exports.CreateExpenseDto = CreateExpenseDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Branch ID', format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Expense category ID', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "category_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Expense title', maxLength: 255, example: 'April Clinic Rent' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Amount', example: 25000.00, minimum: 0.01 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateExpenseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Expense date (YYYY-MM-DD)', example: '2026-04-01' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Payment mode',
        enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['cash', 'bank_transfer', 'upi', 'card', 'cheque']),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "payment_mode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vendor / payee name', maxLength: 255 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "vendor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Receipt file URL', maxLength: 1000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "receipt_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is this a recurring expense', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateExpenseDto.prototype, "is_recurring", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Recurring frequency',
        enum: ['monthly', 'quarterly', 'yearly'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['monthly', 'quarterly', 'yearly']),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "recurring_frequency", void 0);
//# sourceMappingURL=create-expense.dto.js.map