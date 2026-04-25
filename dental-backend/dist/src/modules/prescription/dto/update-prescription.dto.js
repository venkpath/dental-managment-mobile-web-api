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
exports.UpdatePrescriptionDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const create_prescription_dto_js_1 = require("./create-prescription.dto.js");
class UpdatePrescriptionDto {
    diagnosis;
    instructions;
    chief_complaint;
    past_dental_history;
    allergies_medical_history;
    dentist_id;
    items;
    static _OPENAPI_METADATA_FACTORY() {
        return { diagnosis: { required: false, type: () => String, maxLength: 500 }, instructions: { required: false, type: () => String }, chief_complaint: { required: false, type: () => String }, past_dental_history: { required: false, type: () => String }, allergies_medical_history: { required: false, type: () => String }, dentist_id: { required: false, type: () => String, format: "uuid" }, items: { required: false, type: () => [require("./create-prescription.dto").PrescriptionItemDto], minItems: 1 } };
    }
}
exports.UpdatePrescriptionDto = UpdatePrescriptionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Updated diagnosis', maxLength: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdatePrescriptionDto.prototype, "diagnosis", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Updated instructions' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePrescriptionDto.prototype, "instructions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePrescriptionDto.prototype, "chief_complaint", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePrescriptionDto.prototype, "past_dental_history", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePrescriptionDto.prototype, "allergies_medical_history", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdatePrescriptionDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [create_prescription_dto_js_1.PrescriptionItemDto], description: 'Replaces all existing medicine items' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_prescription_dto_js_1.PrescriptionItemDto),
    __metadata("design:type", Array)
], UpdatePrescriptionDto.prototype, "items", void 0);
//# sourceMappingURL=update-prescription.dto.js.map