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
exports.ImageImportDto = exports.BulkImportDto = exports.ImportPatientRow = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class ImportPatientRow {
    first_name;
    last_name;
    phone;
    email;
    gender;
    age;
    date_of_birth;
    blood_group;
    allergies;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { first_name: { required: true, type: () => String }, last_name: { required: true, type: () => String }, phone: { required: true, type: () => String }, email: { required: false, type: () => String }, gender: { required: false, type: () => String }, age: { required: false, type: () => Object }, date_of_birth: { required: false, type: () => String }, blood_group: { required: false, type: () => String }, allergies: { required: false, type: () => String }, notes: { required: false, type: () => String } };
    }
}
exports.ImportPatientRow = ImportPatientRow;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "first_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Doe' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "last_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '9876543210' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'john@email.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Male' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '30' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ImportPatientRow.prototype, "age", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1990-05-15' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "date_of_birth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'O+' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "blood_group", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Penicillin' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "allergies", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Regular patient' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportPatientRow.prototype, "notes", void 0);
class BulkImportDto {
    branch_id;
    patients;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patients: { required: true, type: () => [require("./import-patients.dto").ImportPatientRow] } };
    }
}
exports.BulkImportDto = BulkImportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch ID to assign imported patients to' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], BulkImportDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ImportPatientRow], description: 'Array of patient rows' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ImportPatientRow),
    __metadata("design:type", Array)
], BulkImportDto.prototype, "patients", void 0);
class ImageImportDto {
    branch_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" } };
    }
}
exports.ImageImportDto = ImageImportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch ID to assign imported patients to' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ImageImportDto.prototype, "branch_id", void 0);
//# sourceMappingURL=import-patients.dto.js.map