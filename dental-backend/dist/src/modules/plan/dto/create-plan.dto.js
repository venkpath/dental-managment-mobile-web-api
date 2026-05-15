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
exports.CreatePlanDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreatePlanDto {
    name;
    price_monthly;
    price_yearly;
    max_branches;
    max_staff;
    ai_quota;
    ai_overage_cap;
    max_patients_per_month;
    max_appointments_per_month;
    max_invoices_per_month;
    max_treatments_per_month;
    max_prescriptions_per_month;
    max_consultations_per_month;
    razorpay_plan_id;
    razorpay_plan_id_yearly;
    whatsapp_included_monthly;
    whatsapp_hard_limit_monthly;
    allow_whatsapp_overage_billing;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String, maxLength: 100 }, price_monthly: { required: true, type: () => Number, minimum: 0 }, price_yearly: { required: false, type: () => Number, minimum: 0 }, max_branches: { required: true, type: () => Number, minimum: 1 }, max_staff: { required: true, type: () => Number, minimum: 1 }, ai_quota: { required: false, type: () => Number, minimum: 0 }, ai_overage_cap: { required: false, type: () => Number, minimum: 0 }, max_patients_per_month: { required: false, type: () => Number, minimum: 0 }, max_appointments_per_month: { required: false, type: () => Number, minimum: 0 }, max_invoices_per_month: { required: false, type: () => Number, minimum: 0 }, max_treatments_per_month: { required: false, type: () => Number, minimum: 0 }, max_prescriptions_per_month: { required: false, type: () => Number, minimum: 0 }, max_consultations_per_month: { required: false, type: () => Number, minimum: 0 }, razorpay_plan_id: { required: false, type: () => String, maxLength: 100 }, razorpay_plan_id_yearly: { required: false, type: () => String, maxLength: 100 }, whatsapp_included_monthly: { required: false, type: () => Number, minimum: 0 }, whatsapp_hard_limit_monthly: { required: false, type: () => Number, minimum: 0 }, allow_whatsapp_overage_billing: { required: false, type: () => Boolean } };
    }
}
exports.CreatePlanDto = CreatePlanDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Basic', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePlanDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 999, description: 'Monthly price in INR (GST-inclusive)' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "price_monthly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 9999, description: 'Yearly price in INR (GST-inclusive). Null = monthly only.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "price_yearly", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, description: 'Maximum number of branches allowed' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "max_branches", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10, description: 'Maximum number of staff members allowed' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "max_staff", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 100, description: 'Base AI requests included per cycle (0 = no AI access)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "ai_quota", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 50, description: 'Max additional (pay-per-use) AI requests allowed beyond ai_quota per cycle (0 = no overage)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "ai_overage_cap", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Max patients per month (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "max_patients_per_month", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Max appointments per month (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "max_appointments_per_month", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Max invoices per month (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "max_invoices_per_month", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Max treatments per month (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "max_treatments_per_month", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Max prescriptions per month (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "max_prescriptions_per_month", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Max consultations per month (null = unlimited)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "max_consultations_per_month", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'plan_XXXXXXXXXXXXX', description: 'Razorpay monthly subscription plan ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePlanDto.prototype, "razorpay_plan_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'plan_YYYYYYYYYYYYY', description: 'Razorpay yearly subscription plan ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePlanDto.prototype, "razorpay_plan_id_yearly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'WhatsApp messages included per month (null = unlimited / BYO WABA)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "whatsapp_included_monthly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Hard cap that blocks further WA sends (null = no block, overage allowed)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "whatsapp_hard_limit_monthly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Track WhatsApp overage for billing via payment link', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePlanDto.prototype, "allow_whatsapp_overage_billing", void 0);
//# sourceMappingURL=create-plan.dto.js.map