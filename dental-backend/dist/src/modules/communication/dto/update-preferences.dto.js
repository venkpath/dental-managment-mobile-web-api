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
exports.UpdatePreferencesDto = exports.PreferredChannel = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var PreferredChannel;
(function (PreferredChannel) {
    PreferredChannel["EMAIL"] = "email";
    PreferredChannel["SMS"] = "sms";
    PreferredChannel["WHATSAPP"] = "whatsapp";
})(PreferredChannel || (exports.PreferredChannel = PreferredChannel = {}));
class UpdatePreferencesDto {
    allow_email;
    allow_sms;
    allow_whatsapp;
    allow_marketing;
    allow_reminders;
    preferred_channel;
    quiet_hours_start;
    quiet_hours_end;
    static _OPENAPI_METADATA_FACTORY() {
        return { allow_email: { required: false, type: () => Boolean }, allow_sms: { required: false, type: () => Boolean }, allow_whatsapp: { required: false, type: () => Boolean }, allow_marketing: { required: false, type: () => Boolean }, allow_reminders: { required: false, type: () => Boolean }, preferred_channel: { required: false, enum: require("./update-preferences.dto").PreferredChannel }, quiet_hours_start: { required: false, type: () => String, pattern: "/^([01]\\d|2[0-3]):[0-5]\\d$/" }, quiet_hours_end: { required: false, type: () => String, pattern: "/^([01]\\d|2[0-3]):[0-5]\\d$/" } };
    }
}
exports.UpdatePreferencesDto = UpdatePreferencesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePreferencesDto.prototype, "allow_email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePreferencesDto.prototype, "allow_sms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePreferencesDto.prototype, "allow_whatsapp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePreferencesDto.prototype, "allow_marketing", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePreferencesDto.prototype, "allow_reminders", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: PreferredChannel, example: 'whatsapp' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PreferredChannel),
    __metadata("design:type", String)
], UpdatePreferencesDto.prototype, "preferred_channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '21:00', description: 'Quiet hours start (HH:mm)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quiet_hours_start must be in HH:mm format' }),
    __metadata("design:type", String)
], UpdatePreferencesDto.prototype, "quiet_hours_start", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '09:00', description: 'Quiet hours end (HH:mm)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quiet_hours_end must be in HH:mm format' }),
    __metadata("design:type", String)
], UpdatePreferencesDto.prototype, "quiet_hours_end", void 0);
//# sourceMappingURL=update-preferences.dto.js.map