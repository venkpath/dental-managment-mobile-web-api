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
exports.RegisterClinicDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RegisterClinicDto {
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
    plan_key;
    static _OPENAPI_METADATA_FACTORY() {
        return { clinic_name: { required: true, type: () => String, maxLength: 255 }, clinic_email: { required: true, type: () => String, maxLength: 255, format: "email" }, clinic_phone: { required: false, type: () => String, maxLength: 50 }, address: { required: false, type: () => String, maxLength: 500 }, city: { required: false, type: () => String, maxLength: 100 }, state: { required: false, type: () => String, maxLength: 100 }, country: { required: false, type: () => String, maxLength: 100 }, admin_name: { required: true, type: () => String, maxLength: 255 }, admin_email: { required: true, type: () => String, maxLength: 255, format: "email" }, admin_password: { required: true, type: () => String, minLength: 8 }, plan_key: { required: false, type: () => String, maxLength: 50 } };
    }
}
exports.RegisterClinicDto = RegisterClinicDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bright Smile Dental', maxLength: 255 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "clinic_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'clinic@brightsmile.com', maxLength: 255 }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "clinic_email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+91-9876543210', maxLength: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "clinic_phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '123 Main Street, Koramangala', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Bangalore', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Karnataka', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'India', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dr. Priya Sharma', maxLength: 255 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "admin_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'priya@brightsmile.com', maxLength: 255 }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "admin_email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'StrongP@ss1', minLength: 8 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "admin_password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'starter', description: 'Plan key: starter, professional, enterprise. Defaults to trial.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], RegisterClinicDto.prototype, "plan_key", void 0);
//# sourceMappingURL=register.dto.js.map