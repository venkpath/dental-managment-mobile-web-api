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
exports.GenerateCampaignContentDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class GenerateCampaignContentDto {
    campaign_name;
    campaign_type;
    channel;
    target_audience;
    audience_size;
    special_offer;
    additional_context;
    static _OPENAPI_METADATA_FACTORY() {
        return { campaign_name: { required: true, type: () => String }, campaign_type: { required: true, type: () => String }, channel: { required: true, type: () => String }, target_audience: { required: true, type: () => String }, audience_size: { required: true, type: () => Number, minimum: 1 }, special_offer: { required: false, type: () => String }, additional_context: { required: false, type: () => String } };
    }
}
exports.GenerateCampaignContentDto = GenerateCampaignContentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Diwali Special Checkup Offer' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateCampaignContentDto.prototype, "campaign_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'promotional' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateCampaignContentDto.prototype, "campaign_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'sms' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateCampaignContentDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Inactive patients for 3+ months' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateCampaignContentDto.prototype, "target_audience", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 150 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], GenerateCampaignContentDto.prototype, "audience_size", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '20% off on teeth whitening' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateCampaignContentDto.prototype, "special_offer", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Festival season campaign' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateCampaignContentDto.prototype, "additional_context", void 0);
//# sourceMappingURL=generate-campaign-content.dto.js.map