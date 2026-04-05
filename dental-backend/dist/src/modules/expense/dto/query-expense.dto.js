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
exports.QueryExpenseDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const pagination_query_dto_js_1 = require("../../../common/dto/pagination-query.dto.js");
class QueryExpenseDto extends pagination_query_dto_js_1.PaginationQueryDto {
    branch_id;
    category_id;
    start_date;
    end_date;
    payment_mode;
    search;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: false, type: () => String, format: "uuid" }, category_id: { required: false, type: () => String, format: "uuid" }, start_date: { required: false, type: () => String }, end_date: { required: false, type: () => String }, payment_mode: { required: false, type: () => String, enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque'] }, search: { required: false, type: () => String } };
    }
}
exports.QueryExpenseDto = QueryExpenseDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by branch ID', format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryExpenseDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by category ID', format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryExpenseDto.prototype, "category_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Start date (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryExpenseDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'End date (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryExpenseDto.prototype, "end_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by payment mode',
        enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['cash', 'bank_transfer', 'upi', 'card', 'cheque']),
    __metadata("design:type", String)
], QueryExpenseDto.prototype, "payment_mode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search by title or vendor' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryExpenseDto.prototype, "search", void 0);
//# sourceMappingURL=query-expense.dto.js.map