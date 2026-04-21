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
exports.CreateClinicalVisitDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateClinicalVisitDto {
    branch_id;
    patient_id;
    dentist_id;
    appointment_id;
    chief_complaint;
    history_of_present_illness;
    past_dental_history;
    medical_history_notes;
    examination_notes;
    review_after_date;
    vital_signs;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, dentist_id: { required: true, type: () => String, format: "uuid" }, appointment_id: { required: false, type: () => String, format: "uuid" }, chief_complaint: { required: false, type: () => String }, history_of_present_illness: { required: false, type: () => String }, past_dental_history: { required: false, type: () => String }, medical_history_notes: { required: false, type: () => String }, examination_notes: { required: false, type: () => String }, review_after_date: { required: false, type: () => String }, vital_signs: { required: false, type: () => Object } };
    }
}
exports.CreateClinicalVisitDto = CreateClinicalVisitDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Linked scheduled appointment UUID (null for walk-in)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "appointment_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Pain in lower-right molar while chewing for 3 days' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "chief_complaint", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'History of present illness' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "history_of_present_illness", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Past dental history — previous extractions, RCTs, orthodontic work, etc.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "past_dental_history", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: "Clinician's notes reviewing patient's medical history at this visit" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "medical_history_notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Clinical examination findings' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "examination_notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Recommended review/follow-up date (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateClinicalVisitDto.prototype, "review_after_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vital signs JSON (bp, pulse, temp, etc.)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateClinicalVisitDto.prototype, "vital_signs", void 0);
//# sourceMappingURL=create-clinical-visit.dto.js.map