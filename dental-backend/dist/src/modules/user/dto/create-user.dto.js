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
exports.CreateUserDto = exports.UserRole = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "Admin";
    UserRole["DENTIST"] = "Dentist";
    UserRole["RECEPTIONIST"] = "Receptionist";
})(UserRole || (exports.UserRole = UserRole = {}));
class CreateUserDto {
    branch_id;
    name;
    email;
    password;
    phone;
    role;
    license_number;
    signature_url;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: false, type: () => String, format: "uuid" }, name: { required: true, type: () => String, maxLength: 255 }, email: { required: true, type: () => String, maxLength: 255, format: "email" }, password: { required: false, type: () => String, minLength: 8 }, phone: { required: false, type: () => String, maxLength: 20 }, role: { required: true, enum: require("./create-user.dto").UserRole }, license_number: { required: false, type: () => String, maxLength: 100 }, signature_url: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dr. Jane Smith', maxLength: 255 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateUserDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'jane@brightsmile.com', maxLength: 255 }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'StrongP@ss1', description: 'Defaults to Admin@123 if not provided', minLength: 8 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+919876543210', maxLength: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: UserRole, example: UserRole.DENTIST }),
    (0, class_validator_1.IsEnum)(UserRole),
    __metadata("design:type", String)
], CreateUserDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'KDC-12345', description: 'Doctor registration / license number printed on prescription PDFs', maxLength: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateUserDto.prototype, "license_number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'clinics/abc/doctor-signatures/xyz.png', description: 'S3 key of the uploaded signature image. Set via POST /users/:id/signature.', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateUserDto.prototype, "signature_url", void 0);
//# sourceMappingURL=create-user.dto.js.map