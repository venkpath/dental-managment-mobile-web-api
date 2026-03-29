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
exports.CreateCampaignDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateCampaignDto {
    name;
    channel;
    template_id;
    segment_type;
    segment_config;
    scheduled_at;
    button_url_suffix;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, channel: { required: true, type: () => String }, template_id: { required: false, type: () => String, format: "uuid" }, segment_type: { required: true, type: () => String }, segment_config: { required: false, type: () => Object }, scheduled_at: { required: false, type: () => String }, button_url_suffix: { required: false, type: () => String, maxLength: 2000, format: "uri" } };
    }
}
exports.CreateCampaignDto = CreateCampaignDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Diwali Special Offer 2026' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['email', 'sms', 'whatsapp', 'all'], example: 'whatsapp' }),
    (0, class_validator_1.IsEnum)(['email', 'sms', 'whatsapp', 'all']),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Template ID to use for this campaign' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "template_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ['all', 'inactive', 'treatment_type', 'birthday_month', 'location', 'custom'],
        example: 'all',
    }),
    (0, class_validator_1.IsEnum)(['all', 'inactive', 'treatment_type', 'birthday_month', 'location', 'custom']),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "segment_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Segment filter config (e.g., { inactive_months: 3 } or { treatment: "RCT" })',
        example: { inactive_months: 6 },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCampaignDto.prototype, "segment_config", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Schedule campaign for a future datetime (ISO string)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "scheduled_at", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'URL for WhatsApp template URL buttons (e.g. booking page). Required when using a template with a "Visit Website" button.',
        example: 'https://www.smartdentaldesk.com/booking/smile',
        maxLength: 2000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "button_url_suffix", void 0);
//# sourceMappingURL=create-campaign.dto.js.map