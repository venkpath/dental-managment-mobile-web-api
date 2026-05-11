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
exports.SelfRegisterPatientDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const create_patient_dto_js_1 = require("./create-patient.dto.js");
class SelfRegisterPatientDto {
    first_name;
    last_name;
    phone;
    email;
    gender;
    date_of_birth;
    age;
    static _OPENAPI_METADATA_FACTORY() {
        return { first_name: { required: true, type: () => String, maxLength: 100 }, last_name: { required: true, type: () => String, maxLength: 100 }, phone: { required: true, type: () => String, maxLength: 50 }, email: { required: false, type: () => String, maxLength: 255, format: "email" }, gender: { required: false, enum: require("./create-patient.dto").Gender }, date_of_birth: { required: false, type: () => String }, age: { required: false, type: () => Number, minimum: 0, maximum: 150 } };
    }
}
exports.SelfRegisterPatientDto = SelfRegisterPatientDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ravi', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], SelfRegisterPatientDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Kumar', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], SelfRegisterPatientDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '9876543210', maxLength: 50, description: 'Patient mobile number' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], SelfRegisterPatientDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ravi@email.com', maxLength: 255 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], SelfRegisterPatientDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Male', enum: create_patient_dto_js_1.Gender }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(create_patient_dto_js_1.Gender),
    __metadata("design:type", String)
], SelfRegisterPatientDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1990-05-15', description: 'Date of birth (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SelfRegisterPatientDto.prototype, "date_of_birth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(150),
    __metadata("design:type", Number)
], SelfRegisterPatientDto.prototype, "age", void 0);
//# sourceMappingURL=self-register-patient.dto.js.map