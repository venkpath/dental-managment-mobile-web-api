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
exports.UpdateClinicLimitsDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateClinicLimitsDto {
    custom_patient_limit;
    custom_appointment_limit;
    custom_invoice_limit;
    custom_treatment_limit;
    custom_prescription_limit;
    custom_consultation_limit;
    static _OPENAPI_METADATA_FACTORY() {
        return { custom_patient_limit: { required: false, type: () => Number, nullable: true, minimum: 1 }, custom_appointment_limit: { required: false, type: () => Number, nullable: true, minimum: 1 }, custom_invoice_limit: { required: false, type: () => Number, nullable: true, minimum: 1 }, custom_treatment_limit: { required: false, type: () => Number, nullable: true, minimum: 1 }, custom_prescription_limit: { required: false, type: () => Number, nullable: true, minimum: 1 }, custom_consultation_limit: { required: false, type: () => Number, nullable: true, minimum: 1 } };
    }
}
exports.UpdateClinicLimitsDto = UpdateClinicLimitsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monthly patient limit override (null = use plan default)', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateClinicLimitsDto.prototype, "custom_patient_limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monthly appointment limit override (null = use plan default)', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateClinicLimitsDto.prototype, "custom_appointment_limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monthly invoice limit override (null = use plan default)', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateClinicLimitsDto.prototype, "custom_invoice_limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monthly treatment limit override (null = use plan default)', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateClinicLimitsDto.prototype, "custom_treatment_limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monthly prescription limit override (null = use plan default)', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateClinicLimitsDto.prototype, "custom_prescription_limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monthly consultation limit override (null = use plan default)', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateClinicLimitsDto.prototype, "custom_consultation_limit", void 0);
//# sourceMappingURL=update-clinic-limits.dto.js.map