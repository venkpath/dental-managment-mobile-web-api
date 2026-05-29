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
exports.LoginByPhoneDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class LoginByPhoneDto {
    phone;
    password;
    clinic_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { phone: { required: true, type: () => String, pattern: "/^\\+[1-9]\\d{6,14}$/" }, password: { required: true, type: () => String, minLength: 8 }, clinic_id: { required: true, type: () => String, format: "uuid" } };
    }
}
exports.LoginByPhoneDto = LoginByPhoneDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+919876543210' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+[1-9]\d{6,14}$/, { message: 'Enter a valid phone number with country code (e.g. +919876543210)' }),
    __metadata("design:type", String)
], LoginByPhoneDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'StrongP@ss1' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], LoginByPhoneDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], LoginByPhoneDto.prototype, "clinic_id", void 0);
//# sourceMappingURL=login-by-phone.dto.js.map