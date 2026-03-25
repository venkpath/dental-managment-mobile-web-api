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
exports.QueryAvailableSlotsDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class QueryAvailableSlotsDto {
    branch_id;
    dentist_id;
    date;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, dentist_id: { required: true, type: () => String, format: "uuid" }, date: { required: true, type: () => String } };
    }
}
exports.QueryAvailableSlotsDto = QueryAvailableSlotsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryAvailableSlotsDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Dentist UUID', example: '550e8400-e29b-41d4-a716-446655440002' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryAvailableSlotsDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date to check (YYYY-MM-DD)', example: '2026-03-15' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryAvailableSlotsDto.prototype, "date", void 0);
//# sourceMappingURL=query-available-slots.dto.js.map