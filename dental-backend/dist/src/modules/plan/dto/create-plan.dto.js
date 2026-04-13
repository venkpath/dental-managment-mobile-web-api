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
    max_branches;
    max_staff;
    ai_quota;
    razorpay_plan_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String, maxLength: 100 }, price_monthly: { required: true, type: () => Number, minimum: 0 }, max_branches: { required: true, type: () => Number, minimum: 1 }, max_staff: { required: true, type: () => Number, minimum: 1 }, ai_quota: { required: false, type: () => Number, minimum: 0 }, razorpay_plan_id: { required: false, type: () => String, maxLength: 100 } };
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
    (0, swagger_1.ApiProperty)({ example: 49.99, description: 'Monthly price in USD' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "price_monthly", void 0);
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
    (0, swagger_1.ApiPropertyOptional)({ example: 100, description: 'AI usage quota (0 = no AI access)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreatePlanDto.prototype, "ai_quota", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'plan_XXXXXXXXXXXXX', description: 'Razorpay subscription plan ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePlanDto.prototype, "razorpay_plan_id", void 0);
//# sourceMappingURL=create-plan.dto.js.map