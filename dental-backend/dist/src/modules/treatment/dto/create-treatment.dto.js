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
exports.CreateTreatmentDto = exports.TreatmentStatus = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
var TreatmentStatus;
(function (TreatmentStatus) {
    TreatmentStatus["PLANNED"] = "planned";
    TreatmentStatus["IN_PROGRESS"] = "in_progress";
    TreatmentStatus["COMPLETED"] = "completed";
})(TreatmentStatus || (exports.TreatmentStatus = TreatmentStatus = {}));
class CreateTreatmentDto {
    branch_id;
    patient_id;
    dentist_id;
    tooth_number;
    diagnosis;
    procedure;
    cost;
    status;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, dentist_id: { required: true, type: () => String, format: "uuid" }, tooth_number: { required: false, type: () => String, maxLength: 10 }, diagnosis: { required: true, type: () => String, maxLength: 500 }, procedure: { required: true, type: () => String, maxLength: 500 }, cost: { required: true, type: () => Number, minimum: 0 }, status: { required: false, enum: require("./create-treatment.dto").TreatmentStatus }, notes: { required: false, type: () => String } };
    }
}
exports.CreateTreatmentDto = CreateTreatmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTreatmentDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTreatmentDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTreatmentDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '14',
        maxLength: 10,
        description: 'FDI tooth number (e.g. 11-48 for permanent, 51-85 for primary)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    (0, class_transformer_1.Transform)(({ value }) => value != null ? String(value) : value),
    __metadata("design:type", String)
], CreateTreatmentDto.prototype, "tooth_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Dental caries – mesial surface', maxLength: 500 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateTreatmentDto.prototype, "diagnosis", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Composite restoration (Class II)', maxLength: 500 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateTreatmentDto.prototype, "procedure", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2500.0, description: 'Treatment cost' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateTreatmentDto.prototype, "cost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'planned', enum: TreatmentStatus, default: TreatmentStatus.PLANNED }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(TreatmentStatus),
    __metadata("design:type", String)
], CreateTreatmentDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Patient reported sensitivity to cold' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTreatmentDto.prototype, "notes", void 0);
//# sourceMappingURL=create-treatment.dto.js.map