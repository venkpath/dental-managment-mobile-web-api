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
exports.OnboardClinicDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class OnboardClinicDto {
    clinic_name;
    clinic_email;
    clinic_phone;
    address;
    city;
    state;
    country;
    admin_name;
    admin_email;
    admin_password;
    plan_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { clinic_name: { required: true, type: () => String, maxLength: 255 }, clinic_email: { required: true, type: () => String, maxLength: 255, format: "email" }, clinic_phone: { required: false, type: () => String, maxLength: 50 }, address: { required: false, type: () => String, maxLength: 500 }, city: { required: false, type: () => String, maxLength: 100 }, state: { required: false, type: () => String, maxLength: 100 }, country: { required: false, type: () => String, maxLength: 100 }, admin_name: { required: true, type: () => String, maxLength: 255 }, admin_email: { required: true, type: () => String, maxLength: 255, format: "email" }, admin_password: { required: true, type: () => String, minLength: 8 }, plan_id: { required: false, type: () => String, format: "uuid" } };
    }
}
exports.OnboardClinicDto = OnboardClinicDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Smile Dental Care' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "clinic_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'clinic@example.com' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "clinic_email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+91 98765 43210' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "clinic_phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'MG Road, Koramangala' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Bangalore' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Karnataka' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'India' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dr. John Doe' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "admin_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'admin@example.com' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "admin_email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SecurePass123' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "admin_password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], OnboardClinicDto.prototype, "plan_id", void 0);
//# sourceMappingURL=onboard-clinic.dto.js.map