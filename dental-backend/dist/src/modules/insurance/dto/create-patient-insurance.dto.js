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
exports.CreatePatientInsuranceDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const RELATIONSHIPS = ['self', 'spouse', 'child', 'parent', 'dependent'];
class CreatePatientInsuranceDto {
    plan_id;
    priority;
    member_id;
    group_number;
    employee_id;
    beneficiary_id;
    company_name;
    subscriber_name;
    relationship;
    coverage_start;
    coverage_end;
    is_active;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { plan_id: { required: true, type: () => String, format: "uuid" }, priority: { required: false, type: () => Number, minimum: 1, maximum: 5 }, member_id: { required: true, type: () => String, maxLength: 100 }, group_number: { required: false, type: () => String, maxLength: 100 }, employee_id: { required: false, type: () => String, maxLength: 100 }, beneficiary_id: { required: false, type: () => String, maxLength: 100 }, company_name: { required: false, type: () => String, maxLength: 200 }, subscriber_name: { required: false, type: () => String, maxLength: 200 }, relationship: { required: false, type: () => Object, enum: RELATIONSHIPS }, coverage_start: { required: false, type: () => String }, coverage_end: { required: false, type: () => String }, is_active: { required: false, type: () => Boolean }, notes: { required: false, type: () => String } };
    }
}
exports.CreatePatientInsuranceDto = CreatePatientInsuranceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Insurance plan UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "plan_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: '1 = primary, 2 = secondary (COB)', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], CreatePatientInsuranceDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CGHS-CHN-12345678' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "member_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'GRP-998877' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "group_number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'TCS-EMP-998877' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "employee_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'BEN-CGHS-12345678' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "beneficiary_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Tata Consultancy Services' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Ramesh Iyer' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "subscriber_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: RELATIONSHIPS }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(RELATIONSHIPS),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "relationship", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-04-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "coverage_start", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2027-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "coverage_end", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePatientInsuranceDto.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePatientInsuranceDto.prototype, "notes", void 0);
//# sourceMappingURL=create-patient-insurance.dto.js.map