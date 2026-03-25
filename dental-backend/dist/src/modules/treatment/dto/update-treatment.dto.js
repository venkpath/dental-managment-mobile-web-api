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
exports.UpdateTreatmentDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const create_treatment_dto_js_1 = require("./create-treatment.dto.js");
class UpdateTreatmentDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_treatment_dto_js_1.CreateTreatmentDto, ['branch_id', 'patient_id'])) {
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: false, enum: require("./create-treatment.dto").TreatmentStatus } };
    }
}
exports.UpdateTreatmentDto = UpdateTreatmentDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'completed', enum: create_treatment_dto_js_1.TreatmentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(create_treatment_dto_js_1.TreatmentStatus),
    __metadata("design:type", String)
], UpdateTreatmentDto.prototype, "status", void 0);
//# sourceMappingURL=update-treatment.dto.js.map