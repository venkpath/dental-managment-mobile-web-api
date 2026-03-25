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
exports.CreateFeatureDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateFeatureDto {
    key;
    description;
    static _OPENAPI_METADATA_FACTORY() {
        return { key: { required: true, type: () => String, maxLength: 100, pattern: "/^[A-Z][A-Z0-9_]*$/" }, description: { required: true, type: () => String, maxLength: 500 } };
    }
}
exports.CreateFeatureDto = CreateFeatureDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AI_PRESCRIPTION', description: 'Unique feature key (UPPER_SNAKE_CASE)', maxLength: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(/^[A-Z][A-Z0-9_]*$/, { message: 'key must be UPPER_SNAKE_CASE' }),
    __metadata("design:type", String)
], CreateFeatureDto.prototype, "key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AI-powered prescription generation', maxLength: 500 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateFeatureDto.prototype, "description", void 0);
//# sourceMappingURL=create-feature.dto.js.map