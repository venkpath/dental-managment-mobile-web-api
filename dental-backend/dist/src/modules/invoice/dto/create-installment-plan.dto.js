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
exports.CreateInstallmentPlanDto = exports.InstallmentItemDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class InstallmentItemDto {
    installment_number;
    amount;
    due_date;
    static _OPENAPI_METADATA_FACTORY() {
        return { installment_number: { required: true, type: () => Number, minimum: 1 }, amount: { required: true, type: () => Number, minimum: 0.01 }, due_date: { required: true, type: () => String } };
    }
}
exports.InstallmentItemDto = InstallmentItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Installment number (1-based)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], InstallmentItemDto.prototype, "installment_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8333.33, description: 'Amount for this installment' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], InstallmentItemDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-04-01', description: 'Due date (ISO date)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], InstallmentItemDto.prototype, "due_date", void 0);
class CreateInstallmentPlanDto {
    invoice_id;
    notes;
    items;
    static _OPENAPI_METADATA_FACTORY() {
        return { invoice_id: { required: false, type: () => String, format: "uuid" }, notes: { required: false, type: () => String, maxLength: 1000 }, items: { required: true, type: () => [require("./create-installment-plan.dto").InstallmentItemDto], minItems: 2 } };
    }
}
exports.CreateInstallmentPlanDto = CreateInstallmentPlanDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Invoice UUID (set from URL param)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInstallmentPlanDto.prototype, "invoice_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'RCT treatment – 3 installments', maxLength: 1000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateInstallmentPlanDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [InstallmentItemDto], description: 'Planned installment schedule' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(2, { message: 'At least 2 installments are required' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => InstallmentItemDto),
    __metadata("design:type", Array)
], CreateInstallmentPlanDto.prototype, "items", void 0);
//# sourceMappingURL=create-installment-plan.dto.js.map