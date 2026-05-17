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
exports.UpdateClinicFeaturesDto = exports.FeatureOverrideItem = void 0;
const openapi = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class FeatureOverrideItem {
    feature_id;
    is_enabled;
    reason;
    expires_at;
    static _OPENAPI_METADATA_FACTORY() {
        return { feature_id: { required: true, type: () => String, format: "uuid" }, is_enabled: { required: false, type: () => Boolean, nullable: true, enum: [true, false, null] }, reason: { required: false, type: () => String, maxLength: 500 }, expires_at: { required: false, type: () => String } };
    }
}
exports.FeatureOverrideItem = FeatureOverrideItem;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Feature UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], FeatureOverrideItem.prototype, "feature_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'true = grant on top of plan, false = revoke from plan, null/omitted = remove override (use plan default)',
        nullable: true,
        type: Boolean,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([true, false, null]),
    __metadata("design:type", Object)
], FeatureOverrideItem.prototype, "is_enabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Free-text justification recorded on the override row for support traceability',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], FeatureOverrideItem.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'ISO timestamp at which the override auto-reverts (omit for permanent)',
        format: 'date-time',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], FeatureOverrideItem.prototype, "expires_at", void 0);
class UpdateClinicFeaturesDto {
    overrides;
    static _OPENAPI_METADATA_FACTORY() {
        return { overrides: { required: true, type: () => [require("./update-clinic-features.dto").FeatureOverrideItem], minItems: 1, maxItems: 100 } };
    }
}
exports.UpdateClinicFeaturesDto = UpdateClinicFeaturesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [FeatureOverrideItem] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => FeatureOverrideItem),
    __metadata("design:type", Array)
], UpdateClinicFeaturesDto.prototype, "overrides", void 0);
//# sourceMappingURL=update-clinic-features.dto.js.map