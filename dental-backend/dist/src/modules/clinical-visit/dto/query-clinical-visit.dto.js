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
exports.QueryClinicalVisitDto = exports.ClinicalVisitStatus = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const pagination_query_dto_js_1 = require("../../../common/dto/pagination-query.dto.js");
var ClinicalVisitStatus;
(function (ClinicalVisitStatus) {
    ClinicalVisitStatus["IN_PROGRESS"] = "in_progress";
    ClinicalVisitStatus["FINALIZED"] = "finalized";
    ClinicalVisitStatus["CANCELLED"] = "cancelled";
})(ClinicalVisitStatus || (exports.ClinicalVisitStatus = ClinicalVisitStatus = {}));
class QueryClinicalVisitDto extends pagination_query_dto_js_1.PaginationQueryDto {
    patient_id;
    dentist_id;
    branch_id;
    appointment_id;
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { patient_id: { required: false, type: () => String, format: "uuid" }, dentist_id: { required: false, type: () => String, format: "uuid" }, branch_id: { required: false, type: () => String, format: "uuid" }, appointment_id: { required: false, type: () => String, format: "uuid" }, status: { required: false, enum: require("./query-clinical-visit.dto").ClinicalVisitStatus } };
    }
}
exports.QueryClinicalVisitDto = QueryClinicalVisitDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by patient UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryClinicalVisitDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by dentist UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryClinicalVisitDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by branch UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryClinicalVisitDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by appointment UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryClinicalVisitDto.prototype, "appointment_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by status', enum: ClinicalVisitStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ClinicalVisitStatus),
    __metadata("design:type", String)
], QueryClinicalVisitDto.prototype, "status", void 0);
//# sourceMappingURL=query-clinical-visit.dto.js.map