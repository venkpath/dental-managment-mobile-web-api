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
exports.AssignFeaturesDto = exports.PlanFeatureItemDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class PlanFeatureItemDto {
    feature_id;
    is_enabled;
    static _OPENAPI_METADATA_FACTORY() {
        return { feature_id: { required: true, type: () => String, format: "uuid" }, is_enabled: { required: false, type: () => Boolean } };
    }
}
exports.PlanFeatureItemDto = PlanFeatureItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PlanFeatureItemDto.prototype, "feature_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PlanFeatureItemDto.prototype, "is_enabled", void 0);
class AssignFeaturesDto {
    features;
    static _OPENAPI_METADATA_FACTORY() {
        return { features: { required: true, type: () => [require("./assign-features.dto").PlanFeatureItemDto] } };
    }
}
exports.AssignFeaturesDto = AssignFeaturesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PlanFeatureItemDto], description: 'Features to assign to the plan' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PlanFeatureItemDto),
    __metadata("design:type", Array)
], AssignFeaturesDto.prototype, "features", void 0);
//# sourceMappingURL=assign-features.dto.js.map