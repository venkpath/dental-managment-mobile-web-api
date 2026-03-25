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
exports.CompleteReferralDto = exports.CreateReferralSettingsDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateReferralSettingsDto {
    reward_type;
    reward_value;
    referral_message;
}
exports.CreateReferralSettingsDto = CreateReferralSettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['discount_percentage', 'discount_flat', 'credit']),
    __metadata("design:type", String)
], CreateReferralSettingsDto.prototype, "reward_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateReferralSettingsDto.prototype, "reward_value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Custom message when referring' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReferralSettingsDto.prototype, "referral_message", void 0);
class CompleteReferralDto {
    referral_code;
    referred_patient_id;
}
exports.CompleteReferralDto = CompleteReferralDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompleteReferralDto.prototype, "referral_code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompleteReferralDto.prototype, "referred_patient_id", void 0);
//# sourceMappingURL=index.js.map