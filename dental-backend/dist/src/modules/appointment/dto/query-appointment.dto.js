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
exports.QueryAppointmentDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const pagination_query_dto_js_1 = require("../../../common/dto/pagination-query.dto.js");
class QueryAppointmentDto extends pagination_query_dto_js_1.PaginationQueryDto {
    date;
    start_date;
    end_date;
    status;
    dentist_id;
    branch_id;
    patient_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { date: { required: false, type: () => String }, start_date: { required: false, type: () => String }, end_date: { required: false, type: () => String }, status: { required: false, type: () => String }, dentist_id: { required: false, type: () => String, format: "uuid" }, branch_id: { required: false, type: () => String, format: "uuid" }, patient_id: { required: false, type: () => String, format: "uuid" } };
    }
}
exports.QueryAppointmentDto = QueryAppointmentDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by date (YYYY-MM-DD)', example: '2026-03-15' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryAppointmentDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by start date (YYYY-MM-DD) for range queries', example: '2026-03-10' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryAppointmentDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by end date (YYYY-MM-DD) for range queries', example: '2026-03-16' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryAppointmentDto.prototype, "end_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by status (scheduled, completed, cancelled, no_show)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryAppointmentDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by dentist UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryAppointmentDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by branch UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryAppointmentDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by patient UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryAppointmentDto.prototype, "patient_id", void 0);
//# sourceMappingURL=query-appointment.dto.js.map