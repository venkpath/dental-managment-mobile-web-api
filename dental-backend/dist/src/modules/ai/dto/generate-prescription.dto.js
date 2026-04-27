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
exports.GeneratePrescriptionDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class GeneratePrescriptionDto {
    patient_id;
    diagnosis;
    procedures_performed;
    chief_complaint;
    past_dental_history;
    allergies_medical_history;
    tooth_numbers;
    existing_medications;
    static _OPENAPI_METADATA_FACTORY() {
        return { patient_id: { required: true, type: () => String, format: "uuid" }, diagnosis: { required: true, type: () => String, minLength: 5 }, procedures_performed: { required: false, type: () => String }, chief_complaint: { required: false, type: () => String }, past_dental_history: { required: false, type: () => String }, allergies_medical_history: { required: false, type: () => String }, tooth_numbers: { required: false, type: () => [String] }, existing_medications: { required: false, type: () => String } };
    }
}
exports.GeneratePrescriptionDto = GeneratePrescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Patient UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GeneratePrescriptionDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Irreversible pulpitis on tooth 36, RCT performed',
        description: 'Diagnosis and/or procedures performed',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    __metadata("design:type", String)
], GeneratePrescriptionDto.prototype, "diagnosis", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Root Canal Treatment, Composite filling' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePrescriptionDto.prototype, "procedures_performed", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Sharp pain on lower left while drinking cold water' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePrescriptionDto.prototype, "chief_complaint", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Composite filling on 16 (2019), extraction of 18 (2015)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePrescriptionDto.prototype, "past_dental_history", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Allergies and medical history typed in the prescription form. Merged with patient.allergies.',
        example: 'Penicillin allergy (rash)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePrescriptionDto.prototype, "allergies_medical_history", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['36', '47'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], GeneratePrescriptionDto.prototype, "tooth_numbers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Currently taking Metformin for diabetes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePrescriptionDto.prototype, "existing_medications", void 0);
//# sourceMappingURL=generate-prescription.dto.js.map