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
exports.TestCampaignSendDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class TestCampaignSendDto {
    phone;
    channel;
    template_id;
    template_variables;
    button_url_suffix;
    static _OPENAPI_METADATA_FACTORY() {
        return { phone: { required: true, type: () => String }, channel: { required: true, type: () => String }, template_id: { required: true, type: () => String, format: "uuid" }, template_variables: { required: false, type: () => Object }, button_url_suffix: { required: false, type: () => String, maxLength: 2000, format: "uri" } };
    }
}
exports.TestCampaignSendDto = TestCampaignSendDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+919876543210', description: 'Phone number to receive the test message' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestCampaignSendDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['email', 'sms', 'whatsapp'], example: 'whatsapp' }),
    (0, class_validator_1.IsEnum)(['email', 'sms', 'whatsapp']),
    __metadata("design:type", String)
], TestCampaignSendDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template ID to send' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TestCampaignSendDto.prototype, "template_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Per-variable mapping (same shape as campaign create)',
        example: {
            '1': { type: 'system', key: 'patient_name' },
            '2': { type: 'custom', value: 'Ugadi special — 20% off!' },
        },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], TestCampaignSendDto.prototype, "template_variables", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'URL suffix for WhatsApp template URL buttons',
        example: 'https://www.smartdentaldesk.com/booking/smile',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], TestCampaignSendDto.prototype, "button_url_suffix", void 0);
//# sourceMappingURL=test-campaign-send.dto.js.map