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
exports.CreatePrescriptionDto = exports.PrescriptionItemDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class PrescriptionItemDto {
    medicine_name;
    dosage;
    frequency;
    duration;
    morning;
    afternoon;
    evening;
    night;
    notes;
    route;
    purpose;
    warnings;
    inventory_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { medicine_name: { required: true, type: () => String, maxLength: 255 }, dosage: { required: true, type: () => String, maxLength: 100 }, frequency: { required: true, type: () => String, maxLength: 100 }, duration: { required: true, type: () => String, maxLength: 100 }, morning: { required: false, type: () => Number, minimum: 0 }, afternoon: { required: false, type: () => Number, minimum: 0 }, evening: { required: false, type: () => Number, minimum: 0 }, night: { required: false, type: () => Number, minimum: 0 }, notes: { required: false, type: () => String }, route: { required: false, type: () => String, maxLength: 50 }, purpose: { required: false, type: () => String, maxLength: 255 }, warnings: { required: false, type: () => String }, inventory_id: { required: false, type: () => String, format: "uuid" } };
    }
}
exports.PrescriptionItemDto = PrescriptionItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Amoxicillin 500mg', maxLength: 255 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "medicine_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '500mg', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "dosage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Three times a day after meals', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '5 days', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Morning dose count' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PrescriptionItemDto.prototype, "morning", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0, description: 'Afternoon dose count' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PrescriptionItemDto.prototype, "afternoon", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Evening dose count' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PrescriptionItemDto.prototype, "evening", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0, description: 'Night dose count' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PrescriptionItemDto.prototype, "night", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Take with warm water' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'oral', maxLength: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "route", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Pain relief post-extraction', maxLength: 255 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "purpose", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Avoid driving. Take with food to reduce stomach upset.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "warnings", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'b3a1c2d4-e5f6-7890-abcd-ef0123456789', description: 'Linked InventoryItem UUID when filled from clinic stock' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PrescriptionItemDto.prototype, "inventory_id", void 0);
class CreatePrescriptionDto {
    branch_id;
    patient_id;
    dentist_id;
    clinical_visit_id;
    diagnosis;
    chief_complaint;
    past_dental_history;
    allergies_medical_history;
    instructions;
    interactions;
    dietary_advice;
    post_procedure_instructions;
    follow_up;
    items;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, dentist_id: { required: true, type: () => String, format: "uuid" }, clinical_visit_id: { required: false, type: () => String, format: "uuid" }, diagnosis: { required: true, type: () => String, maxLength: 500 }, chief_complaint: { required: false, type: () => String }, past_dental_history: { required: false, type: () => String }, allergies_medical_history: { required: false, type: () => String }, instructions: { required: false, type: () => String }, interactions: { required: false, type: () => String }, dietary_advice: { required: false, type: () => String }, post_procedure_instructions: { required: false, type: () => String }, follow_up: { required: false, type: () => String }, items: { required: false, type: () => [require("./create-prescription.dto").PrescriptionItemDto] } };
    }
}
exports.CreatePrescriptionDto = CreatePrescriptionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '550e8400-e29b-41d4-a716-446655440003', description: 'Clinical Visit UUID (optional link to consultation)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "clinical_visit_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Post-extraction infection', maxLength: 500 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "diagnosis", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Pain in lower-right molar for 3 days' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "chief_complaint", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'RCT done on tooth 36 in 2024' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "past_dental_history", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Allergic to penicillin. Hypertension on medication.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "allergies_medical_history", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Avoid hot food for 24 hours. Follow up in 1 week.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "instructions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Avoid concurrent NSAIDs while on warfarin.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "interactions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Soft cold foods for 48 hours. Avoid spicy food.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "dietary_advice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Bite on gauze for 30 mins. No rinsing for 24 hours.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "post_procedure_instructions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Review in 7 days if pain persists.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePrescriptionDto.prototype, "follow_up", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [PrescriptionItemDto],
        description: 'List of prescribed medicines. Optional — a prescription may be saved with instructions only.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PrescriptionItemDto),
    __metadata("design:type", Array)
], CreatePrescriptionDto.prototype, "items", void 0);
//# sourceMappingURL=create-prescription.dto.js.map