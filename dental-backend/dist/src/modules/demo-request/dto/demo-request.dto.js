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
exports.UpdateDemoStatusDto = exports.CreateDemoRequestDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateDemoRequestDto {
    name;
    email;
    phone;
    clinicName;
    chairs;
    source;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String, maxLength: 200 }, email: { required: true, type: () => String, maxLength: 255, format: "email" }, phone: { required: true, type: () => String, pattern: "/^[0-9]{10}$/" }, clinicName: { required: false, type: () => String, maxLength: 255 }, chairs: { required: false, type: () => String, enum: ['1', '2-3', '4-6', '7+'] }, source: { required: false, type: () => String, enum: ['website', 'landing_page', 'referral'] } };
    }
}
exports.CreateDemoRequestDto = CreateDemoRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dr. Priya Sharma' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateDemoRequestDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'priya@clinic.com' }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateDemoRequestDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '9876543210' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[0-9]{10}$/, { message: 'phone must be a valid 10-digit Indian number' }),
    __metadata("design:type", String)
], CreateDemoRequestDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Smile Dental Clinic' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateDemoRequestDto.prototype, "clinicName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2-3', enum: ['1', '2-3', '4-6', '7+'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['1', '2-3', '4-6', '7+']),
    __metadata("design:type", String)
], CreateDemoRequestDto.prototype, "chairs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'website', enum: ['website', 'landing_page', 'referral'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['website', 'landing_page', 'referral']),
    __metadata("design:type", String)
], CreateDemoRequestDto.prototype, "source", void 0);
class UpdateDemoStatusDto {
    status;
    notes;
    scheduledAt;
    meetingLink;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: true, type: () => String, enum: ['pending', 'contacted', 'scheduled', 'completed', 'cancelled'] }, notes: { required: false, type: () => String, maxLength: 2000 }, scheduledAt: { required: false, type: () => String }, meetingLink: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.UpdateDemoStatusDto = UpdateDemoStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'scheduled', enum: ['pending', 'contacted', 'scheduled', 'completed', 'cancelled'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['pending', 'contacted', 'scheduled', 'completed', 'cancelled']),
    __metadata("design:type", String)
], UpdateDemoStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Will follow up next week' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateDemoStatusDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-04-20T14:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDemoStatusDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://meet.google.com/abc-defg-hij' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateDemoStatusDto.prototype, "meetingLink", void 0);
//# sourceMappingURL=demo-request.dto.js.map