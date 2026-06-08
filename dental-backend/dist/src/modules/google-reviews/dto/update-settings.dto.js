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
exports.UpdateGoogleReviewSettingsDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateGoogleReviewSettingsDto {
    auto_reply_enabled;
    auto_post_min_rating;
    tone;
    custom_instructions;
    signature;
    notify_admin_on_low;
    static _OPENAPI_METADATA_FACTORY() {
        return { auto_reply_enabled: { required: false, type: () => Boolean }, auto_post_min_rating: { required: false, type: () => Number, minimum: 1, maximum: 5 }, tone: { required: false, type: () => Object, enum: ['warm', 'formal', 'brief'] }, custom_instructions: { required: false, type: () => String, maxLength: 2000 }, signature: { required: false, type: () => String, maxLength: 255 }, notify_admin_on_low: { required: false, type: () => Boolean } };
    }
}
exports.UpdateGoogleReviewSettingsDto = UpdateGoogleReviewSettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Master toggle for auto-replying to new reviews' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateGoogleReviewSettingsDto.prototype, "auto_reply_enabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reviews with rating >= this value get auto-posted; below queues for clinic approval',
        minimum: 1,
        maximum: 5,
        default: 4,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], UpdateGoogleReviewSettingsDto.prototype, "auto_post_min_rating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['warm', 'formal', 'brief'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['warm', 'formal', 'brief']),
    __metadata("design:type", String)
], UpdateGoogleReviewSettingsDto.prototype, "tone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text guidance for the AI', example: 'Always offer a free re-consultation for unhappy patients.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateGoogleReviewSettingsDto.prototype, "custom_instructions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional sign-off appended to replies', example: '— Team Smile Dental' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateGoogleReviewSettingsDto.prototype, "signature", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notify admin when low-rating review needs approval' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateGoogleReviewSettingsDto.prototype, "notify_admin_on_low", void 0);
//# sourceMappingURL=update-settings.dto.js.map