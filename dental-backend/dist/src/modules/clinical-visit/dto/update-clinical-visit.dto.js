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
exports.UpdateClinicalVisitDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_clinical_visit_dto_js_1 = require("./create-clinical-visit.dto.js");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
class UpdateClinicalVisitDto extends (0, swagger_1.PartialType)(create_clinical_visit_dto_js_1.CreateClinicalVisitDto) {
    diagnosis_summary;
    soap_notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { diagnosis_summary: { required: false, type: () => String }, soap_notes: { required: false, type: () => Object } };
    }
}
exports.UpdateClinicalVisitDto = UpdateClinicalVisitDto;
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Diagnosis summary entered during/after examination' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateClinicalVisitDto.prototype, "diagnosis_summary", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'SOAP notes JSON (AI-generated or manual)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateClinicalVisitDto.prototype, "soap_notes", void 0);
//# sourceMappingURL=update-clinical-visit.dto.js.map