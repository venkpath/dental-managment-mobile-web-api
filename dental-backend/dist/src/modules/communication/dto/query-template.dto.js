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
exports.QueryTemplateDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const pagination_query_dto_js_1 = require("../../../common/dto/pagination-query.dto.js");
const create_template_dto_js_1 = require("./create-template.dto.js");
class QueryTemplateDto extends pagination_query_dto_js_1.PaginationQueryDto {
    channel;
    category;
    language;
    search;
    static _OPENAPI_METADATA_FACTORY() {
        return { channel: { required: false, enum: require("./create-template.dto").TemplateChannel }, category: { required: false, enum: require("./create-template.dto").TemplateCategory }, language: { required: false, type: () => String }, search: { required: false, type: () => String } };
    }
}
exports.QueryTemplateDto = QueryTemplateDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: create_template_dto_js_1.TemplateChannel }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(create_template_dto_js_1.TemplateChannel),
    __metadata("design:type", String)
], QueryTemplateDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: create_template_dto_js_1.TemplateCategory }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(create_template_dto_js_1.TemplateCategory),
    __metadata("design:type", String)
], QueryTemplateDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'en' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTemplateDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryTemplateDto.prototype, "search", void 0);
//# sourceMappingURL=query-template.dto.js.map