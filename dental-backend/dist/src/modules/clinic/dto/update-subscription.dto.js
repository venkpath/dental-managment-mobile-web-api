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
exports.UpdateSubscriptionDto = exports.SubscriptionStatus = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["TRIAL"] = "trial";
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["EXPIRED"] = "expired";
    SubscriptionStatus["SUSPENDED"] = "suspended";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
class UpdateSubscriptionDto {
    plan_id;
    subscription_status;
    trial_ends_at;
    ai_usage_count;
    static _OPENAPI_METADATA_FACTORY() {
        return { plan_id: { required: false, type: () => String, format: "uuid" }, subscription_status: { required: false, enum: require("./update-subscription.dto").SubscriptionStatus }, trial_ends_at: { required: false, type: () => String }, ai_usage_count: { required: false, type: () => Number, minimum: 0 } };
    }
}
exports.UpdateSubscriptionDto = UpdateSubscriptionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Plan ID (FK to plans)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateSubscriptionDto.prototype, "plan_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(SubscriptionStatus),
    __metadata("design:type", String)
], UpdateSubscriptionDto.prototype, "subscription_status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-04-06T00:00:00.000Z', description: 'Trial end date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateSubscriptionDto.prototype, "trial_ends_at", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0, description: 'Reset AI usage count' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateSubscriptionDto.prototype, "ai_usage_count", void 0);
//# sourceMappingURL=update-subscription.dto.js.map