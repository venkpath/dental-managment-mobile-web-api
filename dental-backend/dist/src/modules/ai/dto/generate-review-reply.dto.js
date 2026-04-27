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
exports.GenerateReviewReplyDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class GenerateReviewReplyDto {
    rating;
    review_text;
    reviewer_name;
    tone;
    custom_instructions;
    signature;
    static _OPENAPI_METADATA_FACTORY() {
        return { rating: { required: true, type: () => Number, minimum: 1, maximum: 5 }, review_text: { required: false, type: () => String, maxLength: 4000 }, reviewer_name: { required: false, type: () => String, maxLength: 255 }, tone: { required: false, type: () => Object, enum: ['warm', 'formal', 'brief'] }, custom_instructions: { required: false, type: () => String, maxLength: 2000 }, signature: { required: false, type: () => String, maxLength: 255 } };
    }
}
exports.GenerateReviewReplyDto = GenerateReviewReplyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5, minimum: 1, maximum: 5 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], GenerateReviewReplyDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Dr. Patel was so gentle with my kid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(4000),
    __metadata("design:type", String)
], GenerateReviewReplyDto.prototype, "review_text", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Priya R.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], GenerateReviewReplyDto.prototype, "reviewer_name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['warm', 'formal', 'brief'], default: 'warm' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['warm', 'formal', 'brief']),
    __metadata("design:type", String)
], GenerateReviewReplyDto.prototype, "tone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text steering for the LLM, e.g. always mention free re-consultation policy' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], GenerateReviewReplyDto.prototype, "custom_instructions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '— Team Smile Dental' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], GenerateReviewReplyDto.prototype, "signature", void 0);
//# sourceMappingURL=generate-review-reply.dto.js.map