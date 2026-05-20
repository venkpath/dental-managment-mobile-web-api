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
exports.CreateEmpanelmentDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const STATUSES = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING'];
class CreateEmpanelmentDto {
    provider_id;
    empanelment_number;
    valid_from;
    valid_to;
    bank_account_name;
    bank_account_number;
    bank_ifsc;
    bank_name;
    contact_person_name;
    contact_person_phone;
    contact_person_email;
    notes;
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { provider_id: { required: true, type: () => String, format: "uuid" }, empanelment_number: { required: true, type: () => String, maxLength: 100 }, valid_from: { required: false, type: () => String }, valid_to: { required: false, type: () => String }, bank_account_name: { required: false, type: () => String, maxLength: 200 }, bank_account_number: { required: false, type: () => String, maxLength: 50 }, bank_ifsc: { required: false, type: () => String, maxLength: 20 }, bank_name: { required: false, type: () => String, maxLength: 200 }, contact_person_name: { required: false, type: () => String, maxLength: 200 }, contact_person_phone: { required: false, type: () => String, maxLength: 50 }, contact_person_email: { required: false, type: () => String, maxLength: 255, format: "email" }, notes: { required: false, type: () => String }, status: { required: false, type: () => Object, enum: STATUSES } };
    }
}
exports.CreateEmpanelmentDto = CreateEmpanelmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Insurance provider UUID (CGHS, ECHS, Star Health, ...)' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "provider_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CGHS/CHN/DENTAL/2024/0012' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "empanelment_number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-04-01', description: 'ISO date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "valid_from", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2027-03-31', description: 'ISO date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "valid_to", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Smart Dental Desk LLP' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "bank_account_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '50100123456789' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "bank_account_number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'HDFC0001234' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "bank_ifsc", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'HDFC Bank' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "bank_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Mr. Ramesh Iyer' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "contact_person_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+91 98765 43210' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "contact_person_phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'cghs.chennai@nic.in' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "contact_person_email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: STATUSES, default: 'ACTIVE' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(STATUSES),
    __metadata("design:type", String)
], CreateEmpanelmentDto.prototype, "status", void 0);
//# sourceMappingURL=create-empanelment.dto.js.map