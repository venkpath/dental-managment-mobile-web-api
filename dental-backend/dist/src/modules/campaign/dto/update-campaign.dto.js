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
exports.UpdateCampaignDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateCampaignDto {
    name;
    channel;
    template_id;
    segment_type;
    segment_config;
    status;
    scheduled_at;
    template_variables;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, channel: { required: false, type: () => String }, template_id: { required: false, type: () => String, format: "uuid" }, segment_type: { required: false, type: () => String }, segment_config: { required: false, type: () => Object }, status: { required: false, type: () => String }, scheduled_at: { required: false, type: () => String }, template_variables: { required: false, type: () => Object } };
    }
}
exports.UpdateCampaignDto = UpdateCampaignDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCampaignDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['email', 'sms', 'whatsapp', 'all'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['email', 'sms', 'whatsapp', 'all']),
    __metadata("design:type", String)
], UpdateCampaignDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateCampaignDto.prototype, "template_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['all', 'inactive', 'treatment_type', 'birthday_month', 'location', 'custom'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['all', 'inactive', 'treatment_type', 'birthday_month', 'location', 'custom']),
    __metadata("design:type", String)
], UpdateCampaignDto.prototype, "segment_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateCampaignDto.prototype, "segment_config", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['draft', 'scheduled', 'paused', 'cancelled'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['draft', 'scheduled', 'paused', 'cancelled']),
    __metadata("design:type", String)
], UpdateCampaignDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateCampaignDto.prototype, "scheduled_at", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Values for custom (non-system) template variables. See CreateCampaignDto.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateCampaignDto.prototype, "template_variables", void 0);
//# sourceMappingURL=update-campaign.dto.js.map