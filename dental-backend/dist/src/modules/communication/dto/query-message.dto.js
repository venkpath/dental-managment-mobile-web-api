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
exports.QueryMessageDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const pagination_query_dto_js_1 = require("../../../common/dto/pagination-query.dto.js");
const send_message_dto_js_1 = require("./send-message.dto.js");
class QueryMessageDto extends pagination_query_dto_js_1.PaginationQueryDto {
    channel;
    status;
    patient_id;
    start_date;
    end_date;
    static _OPENAPI_METADATA_FACTORY() {
        return { channel: { required: false, enum: require("./send-message.dto").MessageChannel }, status: { required: false, type: () => String }, patient_id: { required: false, type: () => String, format: "uuid" }, start_date: { required: false, type: () => String }, end_date: { required: false, type: () => String } };
    }
}
exports.QueryMessageDto = QueryMessageDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: send_message_dto_js_1.MessageChannel }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(send_message_dto_js_1.MessageChannel),
    __metadata("design:type", String)
], QueryMessageDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'sent' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QueryMessageDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QueryMessageDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryMessageDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryMessageDto.prototype, "end_date", void 0);
//# sourceMappingURL=query-message.dto.js.map