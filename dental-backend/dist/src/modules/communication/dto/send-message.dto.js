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
exports.SendMessageDto = exports.MessageCategory = exports.MessageChannel = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var MessageChannel;
(function (MessageChannel) {
    MessageChannel["EMAIL"] = "email";
    MessageChannel["SMS"] = "sms";
    MessageChannel["WHATSAPP"] = "whatsapp";
    MessageChannel["IN_APP"] = "in_app";
})(MessageChannel || (exports.MessageChannel = MessageChannel = {}));
var MessageCategory;
(function (MessageCategory) {
    MessageCategory["TRANSACTIONAL"] = "transactional";
    MessageCategory["PROMOTIONAL"] = "promotional";
})(MessageCategory || (exports.MessageCategory = MessageCategory = {}));
class SendMessageDto {
    patient_id;
    channel;
    category;
    template_id;
    subject;
    body;
    variables;
    scheduled_at;
    metadata;
    static _OPENAPI_METADATA_FACTORY() {
        return { patient_id: { required: true, type: () => String, format: "uuid" }, channel: { required: true, enum: require("./send-message.dto").MessageChannel }, category: { required: false, enum: require("./send-message.dto").MessageCategory }, template_id: { required: false, type: () => String, format: "uuid" }, subject: { required: false, type: () => String }, body: { required: false, type: () => String }, variables: { required: false, type: () => Object }, scheduled_at: { required: false, type: () => String }, metadata: { required: false, type: () => Object } };
    }
}
exports.SendMessageDto = SendMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440001' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: MessageChannel, example: 'email' }),
    (0, class_validator_1.IsEnum)(MessageChannel),
    __metadata("design:type", String)
], SendMessageDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: MessageCategory, default: 'transactional' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(MessageCategory),
    __metadata("design:type", String)
], SendMessageDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Template ID to use' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "template_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Subject for email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Message body (overrides template)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Template variables' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], SendMessageDto.prototype, "variables", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Schedule for later delivery' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "scheduled_at", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Extra metadata' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], SendMessageDto.prototype, "metadata", void 0);
//# sourceMappingURL=send-message.dto.js.map