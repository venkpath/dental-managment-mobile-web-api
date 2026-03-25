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
exports.CreateToothConditionDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateToothConditionDto {
    branch_id;
    patient_id;
    tooth_id;
    surface_id;
    condition;
    severity;
    notes;
    diagnosed_by;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, tooth_id: { required: true, type: () => String, format: "uuid" }, surface_id: { required: false, type: () => String, format: "uuid" }, condition: { required: true, type: () => String, maxLength: 100 }, severity: { required: false, type: () => String, maxLength: 20 }, notes: { required: false, type: () => String }, diagnosed_by: { required: true, type: () => String, format: "uuid" } };
    }
}
exports.CreateToothConditionDto = CreateToothConditionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch ID', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateToothConditionDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Patient ID', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateToothConditionDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tooth ID', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateToothConditionDto.prototype, "tooth_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tooth surface ID (optional)', format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateToothConditionDto.prototype, "surface_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Condition name (e.g. cavity, fracture, missing)', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateToothConditionDto.prototype, "condition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Severity (mild, moderate, severe)', maxLength: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateToothConditionDto.prototype, "severity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateToothConditionDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Dentist/User ID who diagnosed', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateToothConditionDto.prototype, "diagnosed_by", void 0);
//# sourceMappingURL=create-tooth-condition.dto.js.map