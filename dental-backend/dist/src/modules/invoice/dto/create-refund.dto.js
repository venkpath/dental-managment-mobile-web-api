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
exports.CreateRefundDto = exports.RefundMethod = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
var RefundMethod;
(function (RefundMethod) {
    RefundMethod["CASH"] = "cash";
    RefundMethod["CARD"] = "card";
    RefundMethod["UPI"] = "upi";
    RefundMethod["BANK_TRANSFER"] = "bank_transfer";
})(RefundMethod || (exports.RefundMethod = RefundMethod = {}));
class CreateRefundDto {
    payment_id;
    method;
    amount;
    reason;
    static _OPENAPI_METADATA_FACTORY() {
        return { payment_id: { required: false, type: () => String, format: "uuid" }, method: { required: true, enum: require("./create-refund.dto").RefundMethod }, amount: { required: true, type: () => Number, minimum: 0.01 }, reason: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.CreateRefundDto = CreateRefundDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Optional payment UUID being reversed. When omitted the refund is treated as a generic credit against the invoice (e.g. cancelled treatment with no clear single source payment).',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateRefundDto.prototype, "payment_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cash', enum: RefundMethod, description: 'How the money was returned to the patient' }),
    (0, class_validator_1.IsEnum)(RefundMethod),
    __metadata("design:type", String)
], CreateRefundDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500.0, description: 'Refund amount (positive number).' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRefundDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Patient cancelled the second sitting — refund for unused composite material',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateRefundDto.prototype, "reason", void 0);
//# sourceMappingURL=create-refund.dto.js.map