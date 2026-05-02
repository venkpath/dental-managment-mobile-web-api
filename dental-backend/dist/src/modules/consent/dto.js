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
exports.PublicSignConsentDto = exports.VerifyConsentOtpDto = exports.SendConsentLinkDto = exports.SignDigitalConsentDto = exports.CreatePatientConsentDto = exports.AiGenerateConsentTemplateDto = exports.UpdateConsentTemplateDto = exports.CreateConsentTemplateDto = exports.ConsentTemplateBodyDto = exports.ConsentSectionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ConsentSectionDto {
    heading;
    paragraphs;
    bullets;
}
exports.ConsentSectionDto = ConsentSectionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Risks I acknowledge' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], ConsentSectionDto.prototype, "heading", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ConsentSectionDto.prototype, "paragraphs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ConsentSectionDto.prototype, "bullets", void 0);
class ConsentTemplateBodyDto {
    intro;
    procedure_clause;
    anaesthesia_options;
    sections;
    consent_statement;
    doctor_statement;
    signature_lines;
}
exports.ConsentTemplateBodyDto = ConsentTemplateBodyDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConsentTemplateBodyDto.prototype, "intro", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConsentTemplateBodyDto.prototype, "procedure_clause", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ConsentTemplateBodyDto.prototype, "anaesthesia_options", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ConsentSectionDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ConsentSectionDto),
    __metadata("design:type", Array)
], ConsentTemplateBodyDto.prototype, "sections", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConsentTemplateBodyDto.prototype, "consent_statement", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConsentTemplateBodyDto.prototype, "doctor_statement", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String], example: ['patient', 'doctor'] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsIn)(['patient', 'guardian', 'witness', 'doctor'], { each: true }),
    __metadata("design:type", Array)
], ConsentTemplateBodyDto.prototype, "signature_lines", void 0);
class CreateConsentTemplateDto {
    code;
    language;
    title;
    body;
    is_default;
    is_active;
}
exports.CreateConsentTemplateDto = CreateConsentTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'extraction', description: 'Stable code (slug) — unique per clinic+language' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateConsentTemplateDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'en' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    __metadata("design:type", String)
], CreateConsentTemplateDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Extraction / Oral Surgery Consent' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateConsentTemplateDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ConsentTemplateBodyDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ConsentTemplateBodyDto),
    __metadata("design:type", ConsentTemplateBodyDto)
], CreateConsentTemplateDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateConsentTemplateDto.prototype, "is_default", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateConsentTemplateDto.prototype, "is_active", void 0);
class UpdateConsentTemplateDto {
    title;
    body;
    is_active;
    version;
}
exports.UpdateConsentTemplateDto = UpdateConsentTemplateDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateConsentTemplateDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: ConsentTemplateBodyDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ConsentTemplateBodyDto),
    __metadata("design:type", ConsentTemplateBodyDto)
], UpdateConsentTemplateDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateConsentTemplateDto.prototype, "is_active", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateConsentTemplateDto.prototype, "version", void 0);
class AiGenerateConsentTemplateDto {
    code;
    language;
    procedure_category;
    procedure_examples;
    audience_age;
    include_anaesthesia_options;
    include_witness;
    custom_notes;
}
exports.AiGenerateConsentTemplateDto = AiGenerateConsentTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'crown_bridge' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], AiGenerateConsentTemplateDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'hi' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    __metadata("design:type", String)
], AiGenerateConsentTemplateDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Crown / Bridge / Prosthodontic Consent', description: 'Procedure category for the AI to write about.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], AiGenerateConsentTemplateDto.prototype, "procedure_category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'PFM crown, zirconia crown, 3-unit bridge' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AiGenerateConsentTemplateDto.prototype, "procedure_examples", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['adult', 'child', 'either'], default: 'adult' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['adult', 'child', 'either']),
    __metadata("design:type", String)
], AiGenerateConsentTemplateDto.prototype, "audience_age", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AiGenerateConsentTemplateDto.prototype, "include_anaesthesia_options", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AiGenerateConsentTemplateDto.prototype, "include_witness", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text clinic context appended to the prompt.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AiGenerateConsentTemplateDto.prototype, "custom_notes", void 0);
class CreatePatientConsentDto {
    template_id;
    treatment_id;
    appointment_id;
    procedure;
}
exports.CreatePatientConsentDto = CreatePatientConsentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePatientConsentDto.prototype, "template_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePatientConsentDto.prototype, "treatment_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePatientConsentDto.prototype, "appointment_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text procedure (interpolated into procedure_clause).' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePatientConsentDto.prototype, "procedure", void 0);
class SignDigitalConsentDto {
    signature_data_url;
    signed_by_name;
    witness_staff_id;
    notes;
}
exports.SignDigitalConsentDto = SignDigitalConsentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'PNG data URL captured from the in-app signature pad' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SignDigitalConsentDto.prototype, "signature_data_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ramesh Kumar' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], SignDigitalConsentDto.prototype, "signed_by_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SignDigitalConsentDto.prototype, "witness_staff_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SignDigitalConsentDto.prototype, "notes", void 0);
class SendConsentLinkDto {
    channel;
    expires_in_hours;
}
exports.SendConsentLinkDto = SendConsentLinkDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['whatsapp', 'sms'], default: 'whatsapp' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['whatsapp', 'sms']),
    __metadata("design:type", String)
], SendConsentLinkDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1, maximum: 168, default: 72 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(168),
    __metadata("design:type", Number)
], SendConsentLinkDto.prototype, "expires_in_hours", void 0);
class VerifyConsentOtpDto {
    code;
}
exports.VerifyConsentOtpDto = VerifyConsentOtpDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '482917' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(4, 8),
    __metadata("design:type", String)
], VerifyConsentOtpDto.prototype, "code", void 0);
class PublicSignConsentDto {
    signature_data_url;
    signed_by_name;
    agreed;
}
exports.PublicSignConsentDto = PublicSignConsentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'PNG data URL captured from the on-phone signature pad' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PublicSignConsentDto.prototype, "signature_data_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ramesh Kumar' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], PublicSignConsentDto.prototype, "signed_by_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PublicSignConsentDto.prototype, "agreed", void 0);
//# sourceMappingURL=dto.js.map