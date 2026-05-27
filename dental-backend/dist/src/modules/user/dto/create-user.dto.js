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
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SuperAdmin";
    UserRole["ADMIN"] = "Admin";
    UserRole["DENTIST"] = "Dentist";
    UserRole["RECEPTIONIST"] = "Receptionist";
    UserRole["STAFF"] = "Staff";
    UserRole["CONSULTANT"] = "Consultant";
})(UserRole || (exports.UserRole = UserRole = {}));
class CreateUserDto {
    branch_id;
    name;
    email;
    password;
    phone;
    role;
    is_doctor;
    listed_in_directory;
    license_number;
    signature_url;
    bio;
    years_experience;
    specializations;
    languages_spoken;
    consultation_fee;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: false, type: () => String, format: "uuid" }, name: { required: true, type: () => String, maxLength: 255 }, email: { required: true, type: () => String, maxLength: 255, format: "email" }, password: { required: false, type: () => String, minLength: 8 }, phone: { required: false, type: () => String, maxLength: 20 }, role: { required: true, enum: require("./create-user.dto").UserRole }, is_doctor: { required: false, type: () => Boolean }, listed_in_directory: { required: false, type: () => Boolean }, license_number: { required: false, type: () => String, maxLength: 100 }, signature_url: { required: false, type: () => String, maxLength: 500 }, bio: { required: false, type: () => String, maxLength: 2000 }, years_experience: { required: false, type: () => Number, minimum: 0, maximum: 60 }, specializations: { required: false, type: () => [String] }, languages_spoken: { required: false, type: () => String, maxLength: 255 }, consultation_fee: { required: false, type: () => Number, minimum: 0 } };
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
    (0, swagger_1.ApiPropertyOptional)({ description: 'Mark as doctor regardless of role — appears in doctor dropdowns and receives dentist reminders', example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateUserDto.prototype, "is_doctor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Show this doctor on the public patient-facing directory', example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateUserDto.prototype, "listed_in_directory", void 0);
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
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Specialist in orthodontics with 10+ years of experience.', maxLength: 2000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateUserDto.prototype, "bio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], CreateUserDto.prototype, "years_experience", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['Orthodontics', 'Implants'], description: 'JSON array of specializations' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateUserDto.prototype, "specializations", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'English, Tamil, Hindi', maxLength: 255 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateUserDto.prototype, "languages_spoken", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateUserDto.prototype, "consultation_fee", void 0);
//# sourceMappingURL=create-user.dto.js.map