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
exports.CreateTemplateDto = exports.TemplateCategory = exports.TemplateChannel = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var TemplateChannel;
(function (TemplateChannel) {
    TemplateChannel["EMAIL"] = "email";
    TemplateChannel["SMS"] = "sms";
    TemplateChannel["WHATSAPP"] = "whatsapp";
    TemplateChannel["ALL"] = "all";
})(TemplateChannel || (exports.TemplateChannel = TemplateChannel = {}));
var TemplateCategory;
(function (TemplateCategory) {
    TemplateCategory["REMINDER"] = "reminder";
    TemplateCategory["GREETING"] = "greeting";
    TemplateCategory["CAMPAIGN"] = "campaign";
    TemplateCategory["TRANSACTIONAL"] = "transactional";
    TemplateCategory["FOLLOW_UP"] = "follow_up";
    TemplateCategory["REFERRAL"] = "referral";
})(TemplateCategory || (exports.TemplateCategory = TemplateCategory = {}));
class CreateTemplateDto {
    channel;
    category;
    template_name;
    subject;
    body;
    variables;
    language;
    is_active;
    dlt_template_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { channel: { required: true, enum: require("./create-template.dto").TemplateChannel }, category: { required: true, enum: require("./create-template.dto").TemplateCategory }, template_name: { required: true, type: () => String, maxLength: 255 }, subject: { required: false, type: () => String, maxLength: 500 }, body: { required: true, type: () => String }, variables: { required: false, type: () => [String] }, language: { required: false, type: () => String, maxLength: 5 }, is_active: { required: false, type: () => Boolean }, dlt_template_id: { required: false, type: () => String, maxLength: 100 } };
    }
}
exports.CreateTemplateDto = CreateTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: TemplateChannel, example: 'email' }),
    (0, class_validator_1.IsEnum)(TemplateChannel),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: TemplateCategory, example: 'reminder' }),
    (0, class_validator_1.IsEnum)(TemplateCategory),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Appointment Reminder - 24hr' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "template_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Your appointment is tomorrow' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Hi {{patient_name}}, your appointment is on {{appointment_date}} at {{appointment_time}} with {{dentist_name}}.',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['patient_name', 'appointment_date', 'appointment_time', 'dentist_name'] }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateTemplateDto.prototype, "variables", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'en', default: 'en' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTemplateDto.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'DLT Template ID for SMS compliance' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "dlt_template_id", void 0);
//# sourceMappingURL=create-template.dto.js.map