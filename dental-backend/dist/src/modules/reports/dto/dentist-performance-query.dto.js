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
exports.DentistPerformanceQueryDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class DentistPerformanceQueryDto {
    start_date;
    end_date;
    branch_id;
    dentist_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { start_date: { required: true, type: () => String }, end_date: { required: true, type: () => String }, branch_id: { required: false, type: () => String, format: "uuid" }, dentist_id: { required: false, type: () => String, format: "uuid" } };
    }
}
exports.DentistPerformanceQueryDto = DentistPerformanceQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Start date (YYYY-MM-DD)', example: '2026-03-01' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DentistPerformanceQueryDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'End date (YYYY-MM-DD)', example: '2026-03-31' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DentistPerformanceQueryDto.prototype, "end_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by branch UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DentistPerformanceQueryDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter to a single dentist UUID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DentistPerformanceQueryDto.prototype, "dentist_id", void 0);
//# sourceMappingURL=dentist-performance-query.dto.js.map