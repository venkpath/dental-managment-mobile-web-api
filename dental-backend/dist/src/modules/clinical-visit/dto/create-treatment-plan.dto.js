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
exports.CreateTreatmentPlanDto = exports.TreatmentPlanItemDto = exports.PlanItemUrgency = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
var PlanItemUrgency;
(function (PlanItemUrgency) {
    PlanItemUrgency["IMMEDIATE"] = "immediate";
    PlanItemUrgency["HIGH"] = "high";
    PlanItemUrgency["MEDIUM"] = "medium";
    PlanItemUrgency["LOW"] = "low";
})(PlanItemUrgency || (exports.PlanItemUrgency = PlanItemUrgency = {}));
class TreatmentPlanItemDto {
    tooth_number;
    procedure;
    diagnosis;
    estimated_cost;
    urgency;
    phase;
    sequence;
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { tooth_number: { required: false, type: () => String, maxLength: 100 }, procedure: { required: true, type: () => String, maxLength: 500 }, diagnosis: { required: false, type: () => String, maxLength: 500 }, estimated_cost: { required: true, type: () => Number, minimum: 0 }, urgency: { required: false, enum: require("./create-treatment-plan.dto").PlanItemUrgency }, phase: { required: false, type: () => Number, minimum: 1 }, sequence: { required: false, type: () => Number, minimum: 1 }, notes: { required: false, type: () => String } };
    }
}
exports.TreatmentPlanItemDto = TreatmentPlanItemDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '14,15', description: 'FDI tooth number(s), comma-separated for multiple' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], TreatmentPlanItemDto.prototype, "tooth_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Composite restoration (Class II)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], TreatmentPlanItemDto.prototype, "procedure", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Dental caries – mesial surface' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], TreatmentPlanItemDto.prototype, "diagnosis", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2500.0 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], TreatmentPlanItemDto.prototype, "estimated_cost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: PlanItemUrgency, example: PlanItemUrgency.MEDIUM }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PlanItemUrgency),
    __metadata("design:type", String)
], TreatmentPlanItemDto.prototype, "urgency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Phase number (1 = first phase)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], TreatmentPlanItemDto.prototype, "phase", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Sequence within phase' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], TreatmentPlanItemDto.prototype, "sequence", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TreatmentPlanItemDto.prototype, "notes", void 0);
class CreateTreatmentPlanDto {
    branch_id;
    patient_id;
    dentist_id;
    clinical_visit_id;
    title;
    notes;
    items;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, dentist_id: { required: true, type: () => String, format: "uuid" }, clinical_visit_id: { required: false, type: () => String, format: "uuid" }, title: { required: true, type: () => String, maxLength: 255 }, notes: { required: false, type: () => String }, items: { required: true, type: () => [require("./create-treatment-plan.dto").TreatmentPlanItemDto] } };
    }
}
exports.CreateTreatmentPlanDto = CreateTreatmentPlanDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTreatmentPlanDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Patient UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTreatmentPlanDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Dentist UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTreatmentPlanDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Linked clinical visit UUID (plan created during this visit)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTreatmentPlanDto.prototype, "clinical_visit_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Quadrant-1 Restoration Plan', maxLength: 255 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateTreatmentPlanDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTreatmentPlanDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [TreatmentPlanItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TreatmentPlanItemDto),
    __metadata("design:type", Array)
], CreateTreatmentPlanDto.prototype, "items", void 0);
//# sourceMappingURL=create-treatment-plan.dto.js.map