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
exports.CreateMembershipEnrollmentDto = exports.MembershipEnrollmentMemberDto = void 0;
const openapi = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class MembershipEnrollmentMemberDto {
    patient_id;
    relation_label;
    static _OPENAPI_METADATA_FACTORY() {
        return { patient_id: { required: true, type: () => String, format: "uuid" }, relation_label: { required: false, type: () => String, maxLength: 50 } };
    }
}
exports.MembershipEnrollmentMemberDto = MembershipEnrollmentMemberDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MembershipEnrollmentMemberDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Spouse' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], MembershipEnrollmentMemberDto.prototype, "relation_label", void 0);
class CreateMembershipEnrollmentDto {
    membership_plan_id;
    branch_id;
    primary_patient_id;
    start_date;
    end_date;
    amount_paid;
    notes;
    members;
    static _OPENAPI_METADATA_FACTORY() {
        return { membership_plan_id: { required: true, type: () => String, format: "uuid" }, branch_id: { required: true, type: () => String, format: "uuid" }, primary_patient_id: { required: true, type: () => String, format: "uuid" }, start_date: { required: true, type: () => String }, end_date: { required: false, type: () => String }, amount_paid: { required: false, type: () => Number, minimum: 0 }, notes: { required: false, type: () => String }, members: { required: false, type: () => [require("./create-membership-enrollment.dto").MembershipEnrollmentMemberDto] } };
    }
}
exports.CreateMembershipEnrollmentDto = CreateMembershipEnrollmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMembershipEnrollmentDto.prototype, "membership_plan_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMembershipEnrollmentDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMembershipEnrollmentDto.prototype, "primary_patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-04-16' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMembershipEnrollmentDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2027-04-16' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMembershipEnrollmentDto.prototype, "end_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 400, default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMembershipEnrollmentDto.prototype, "amount_paid", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Front desk issued printed card.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMembershipEnrollmentDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [MembershipEnrollmentMemberDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MembershipEnrollmentMemberDto),
    __metadata("design:type", Array)
], CreateMembershipEnrollmentDto.prototype, "members", void 0);
//# sourceMappingURL=create-membership-enrollment.dto.js.map