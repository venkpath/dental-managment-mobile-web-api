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
exports.UpdateClinicSettingsDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateClinicSettingsDto {
    enable_email;
    enable_sms;
    enable_whatsapp;
    email_provider;
    email_config;
    sms_provider;
    sms_config;
    whatsapp_provider;
    whatsapp_config;
    fallback_chain;
    default_reminder_channels;
    daily_message_limit;
    send_rate_per_minute;
    google_review_url;
    dnd_start;
    dnd_end;
    static _OPENAPI_METADATA_FACTORY() {
        return { enable_email: { required: false, type: () => Boolean }, enable_sms: { required: false, type: () => Boolean }, enable_whatsapp: { required: false, type: () => Boolean }, email_provider: { required: false, type: () => String, maxLength: 50 }, email_config: { required: false, type: () => Object }, sms_provider: { required: false, type: () => String, maxLength: 50 }, sms_config: { required: false, type: () => Object }, whatsapp_provider: { required: false, type: () => String, maxLength: 50 }, whatsapp_config: { required: false, type: () => Object }, fallback_chain: { required: false, type: () => [String] }, default_reminder_channels: { required: false, type: () => [String] }, daily_message_limit: { required: false, type: () => Number, minimum: 1, maximum: 100000 }, send_rate_per_minute: { required: false, type: () => Number, minimum: 1, maximum: 1000 }, google_review_url: { required: false, type: () => String, maxLength: 500 }, dnd_start: { required: false, type: () => String, maxLength: 5 }, dnd_end: { required: false, type: () => String, maxLength: 5 } };
    }
}
exports.UpdateClinicSettingsDto = UpdateClinicSettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateClinicSettingsDto.prototype, "enable_email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateClinicSettingsDto.prototype, "enable_sms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateClinicSettingsDto.prototype, "enable_whatsapp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'gmail' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpdateClinicSettingsDto.prototype, "email_provider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Email SMTP config: { host, port, user, pass }' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateClinicSettingsDto.prototype, "email_config", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'msg91' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpdateClinicSettingsDto.prototype, "sms_provider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SMS config: { api_key, sender_id, dlt_entity_id }' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateClinicSettingsDto.prototype, "sms_config", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'gupshup' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpdateClinicSettingsDto.prototype, "whatsapp_provider", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'WhatsApp config: { api_key, phone_number_id, waba_id }' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateClinicSettingsDto.prototype, "whatsapp_config", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['whatsapp', 'sms', 'email'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateClinicSettingsDto.prototype, "fallback_chain", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['whatsapp', 'sms'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateClinicSettingsDto.prototype, "default_reminder_channels", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100000),
    __metadata("design:type", Number)
], UpdateClinicSettingsDto.prototype, "daily_message_limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    __metadata("design:type", Number)
], UpdateClinicSettingsDto.prototype, "send_rate_per_minute", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://g.page/r/your-clinic/review' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateClinicSettingsDto.prototype, "google_review_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '22:00', description: 'DND quiet hours start (HH:mm)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    __metadata("design:type", String)
], UpdateClinicSettingsDto.prototype, "dnd_start", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '08:00', description: 'DND quiet hours end (HH:mm)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    __metadata("design:type", String)
], UpdateClinicSettingsDto.prototype, "dnd_end", void 0);
//# sourceMappingURL=update-clinic-settings.dto.js.map