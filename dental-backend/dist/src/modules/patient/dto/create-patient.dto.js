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
exports.CreatePatientDto = exports.Gender = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var Gender;
(function (Gender) {
    Gender["MALE"] = "Male";
    Gender["FEMALE"] = "Female";
    Gender["OTHER"] = "Other";
})(Gender || (exports.Gender = Gender = {}));
class CreatePatientDto {
    branch_id;
    first_name;
    last_name;
    phone;
    email;
    gender;
    date_of_birth;
    age;
    blood_group;
    medical_history;
    allergies;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, first_name: { required: true, type: () => String, maxLength: 100 }, last_name: { required: true, type: () => String, maxLength: 100 }, phone: { required: true, type: () => String, maxLength: 50 }, email: { required: false, type: () => String, maxLength: 255, format: "email" }, gender: { required: true, enum: require("./create-patient.dto").Gender }, date_of_birth: { required: false, type: () => String }, age: { required: false, type: () => Number, minimum: 0, maximum: 150 }, blood_group: { required: false, type: () => String, maxLength: 10 }, medical_history: { required: false, type: () => Object }, allergies: { required: false, type: () => String, maxLength: 1000 }, notes: { required: false, type: () => String } };
    }
}
exports.CreatePatientDto = CreatePatientDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+91-9876543210', maxLength: 50 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'john.doe@email.com', maxLength: 255 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Male', enum: Gender }),
    (0, class_validator_1.IsEnum)(Gender),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1990-05-15', description: 'Date of birth (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "date_of_birth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 30, description: 'Patient age (used when DOB is not known)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(150),
    __metadata("design:type", Number)
], CreatePatientDto.prototype, "age", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'O+', maxLength: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "blood_group", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: { diabetes: false, hypertension: true },
        description: 'Structured medical history as JSON',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreatePatientDto.prototype, "medical_history", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Penicillin, Latex', maxLength: 1000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "allergies", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Patient prefers morning appointments' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePatientDto.prototype, "notes", void 0);
//# sourceMappingURL=create-patient.dto.js.map