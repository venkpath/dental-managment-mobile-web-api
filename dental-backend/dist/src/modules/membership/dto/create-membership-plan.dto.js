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
exports.CreateMembershipPlanDto = exports.CreateMembershipBenefitDto = void 0;
const openapi = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateMembershipBenefitDto {
    title;
    description;
    benefit_type;
    treatment_label;
    coverage_scope;
    included_quantity;
    discount_percentage;
    discount_amount;
    credit_amount;
    display_order;
    is_active;
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: true, type: () => String, maxLength: 150 }, description: { required: false, type: () => String }, benefit_type: { required: true, type: () => String, maxLength: 30 }, treatment_label: { required: false, type: () => String, maxLength: 150 }, coverage_scope: { required: false, type: () => String, maxLength: 20 }, included_quantity: { required: false, type: () => Number, minimum: 1 }, discount_percentage: { required: false, type: () => Number, minimum: 0 }, discount_amount: { required: false, type: () => Number, minimum: 0 }, credit_amount: { required: false, type: () => Number, minimum: 0 }, display_order: { required: false, type: () => Number, minimum: 0 }, is_active: { required: false, type: () => Boolean } };
    }
}
exports.CreateMembershipBenefitDto = CreateMembershipBenefitDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Scaling & polishing' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateMembershipBenefitDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Annual preventive cleaning benefit' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMembershipBenefitDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'included_service', description: 'included_service | discount_percentage | discount_flat | credit' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], CreateMembershipBenefitDto.prototype, "benefit_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Scaling and polishing' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateMembershipBenefitDto.prototype, "treatment_label", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'shared', description: 'shared | per_member', default: 'shared' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateMembershipBenefitDto.prototype, "coverage_scope", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateMembershipBenefitDto.prototype, "included_quantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 15 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMembershipBenefitDto.prototype, "discount_percentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMembershipBenefitDto.prototype, "discount_amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMembershipBenefitDto.prototype, "credit_amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMembershipBenefitDto.prototype, "display_order", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateMembershipBenefitDto.prototype, "is_active", void 0);
class CreateMembershipPlanDto {
    code;
    name;
    description;
    category;
    price;
    duration_months;
    covered_members_limit;
    grace_period_days;
    is_active;
    terms_and_conditions;
    benefits;
    static _OPENAPI_METADATA_FACTORY() {
        return { code: { required: false, type: () => String, maxLength: 50 }, name: { required: true, type: () => String, maxLength: 150 }, description: { required: false, type: () => String }, category: { required: false, type: () => String, maxLength: 50 }, price: { required: false, type: () => Number, minimum: 0 }, duration_months: { required: false, type: () => Number, minimum: 1 }, covered_members_limit: { required: false, type: () => Number, minimum: 1 }, grace_period_days: { required: false, type: () => Number, minimum: 0 }, is_active: { required: false, type: () => Boolean }, terms_and_conditions: { required: false, type: () => String }, benefits: { required: true, type: () => [require("./create-membership-plan.dto").CreateMembershipBenefitDto] } };
    }
}
exports.CreateMembershipPlanDto = CreateMembershipPlanDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'FAMILY-ORAL-CARE' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateMembershipPlanDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Family Oral Care Plan' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreateMembershipPlanDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Annual family preventive care package with procedure discounts.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMembershipPlanDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'preventive' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateMembershipPlanDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 400, default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMembershipPlanDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 12, default: 12 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateMembershipPlanDto.prototype, "duration_months", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2, description: 'Maximum covered members including the primary patient', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateMembershipPlanDto.prototype, "covered_members_limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0, default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMembershipPlanDto.prototype, "grace_period_days", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateMembershipPlanDto.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Valid for one year from enrollment date.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMembershipPlanDto.prototype, "terms_and_conditions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateMembershipBenefitDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateMembershipBenefitDto),
    __metadata("design:type", Array)
], CreateMembershipPlanDto.prototype, "benefits", void 0);
//# sourceMappingURL=create-membership-plan.dto.js.map