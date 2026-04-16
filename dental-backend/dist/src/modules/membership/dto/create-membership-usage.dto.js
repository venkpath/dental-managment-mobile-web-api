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
exports.CreateMembershipUsageDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateMembershipUsageDto {
    membership_benefit_id;
    patient_id;
    treatment_id;
    invoice_id;
    quantity_used;
    discount_applied;
    notes;
    used_on;
    static _OPENAPI_METADATA_FACTORY() {
        return { membership_benefit_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, treatment_id: { required: false, type: () => String, format: "uuid" }, invoice_id: { required: false, type: () => String, format: "uuid" }, quantity_used: { required: false, type: () => Number, minimum: 1 }, discount_applied: { required: false, type: () => Number, minimum: 0 }, notes: { required: false, type: () => String }, used_on: { required: false, type: () => String } };
    }
}
exports.CreateMembershipUsageDto = CreateMembershipUsageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMembershipUsageDto.prototype, "membership_benefit_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMembershipUsageDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMembershipUsageDto.prototype, "treatment_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMembershipUsageDto.prototype, "invoice_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 0 }),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateMembershipUsageDto.prototype, "quantity_used", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMembershipUsageDto.prototype, "discount_applied", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Applied during recall visit.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMembershipUsageDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-04-16T10:30:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMembershipUsageDto.prototype, "used_on", void 0);
//# sourceMappingURL=create-membership-usage.dto.js.map