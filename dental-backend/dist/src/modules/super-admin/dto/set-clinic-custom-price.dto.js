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
exports.SetClinicCustomPriceDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class SetClinicCustomPriceDto {
    custom_price_monthly;
    custom_price_yearly;
    expires_at;
    reason;
    static _OPENAPI_METADATA_FACTORY() {
        return { custom_price_monthly: { required: false, type: () => Number, nullable: true, minimum: 1 }, custom_price_yearly: { required: false, type: () => Number, nullable: true, minimum: 1 }, expires_at: { required: false, type: () => String, nullable: true }, reason: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.SetClinicCustomPriceDto = SetClinicCustomPriceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total INR billed per monthly cycle. null = clear the monthly discount.',
        type: Number,
        nullable: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], SetClinicCustomPriceDto.prototype, "custom_price_monthly", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total INR billed per yearly cycle. null = clear the yearly discount.',
        type: Number,
        nullable: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], SetClinicCustomPriceDto.prototype, "custom_price_yearly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'ISO timestamp at which the discount auto-reverts (omit/null for permanent)',
        format: 'date-time',
        nullable: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], SetClinicCustomPriceDto.prototype, "expires_at", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Free-text reason recorded on the clinic for support/finance traceability',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], SetClinicCustomPriceDto.prototype, "reason", void 0);
//# sourceMappingURL=set-clinic-custom-price.dto.js.map