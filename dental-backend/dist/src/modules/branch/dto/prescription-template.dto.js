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
exports.PreviewTemplateDto = exports.SaveTemplateConfigDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class SaveTemplateConfigDto {
    config;
    enabled;
    static _OPENAPI_METADATA_FACTORY() {
        return { config: { required: true, type: () => Object }, enabled: { required: false, type: () => Boolean } };
    }
}
exports.SaveTemplateConfigDto = SaveTemplateConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Zone definitions + image metadata. See PrescriptionTemplateConfig.' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SaveTemplateConfigDto.prototype, "config", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether to use this template (vs default layout). Defaults to true on save.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveTemplateConfigDto.prototype, "enabled", void 0);
class PreviewTemplateDto {
    config;
    with_background;
    static _OPENAPI_METADATA_FACTORY() {
        return { config: { required: true, type: () => Object }, with_background: { required: false, type: () => Boolean } };
    }
}
exports.PreviewTemplateDto = PreviewTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Zone config to preview (does not need to be saved).' }),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], PreviewTemplateDto.prototype, "config", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Render with the notepad image as background (default true).' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PreviewTemplateDto.prototype, "with_background", void 0);
//# sourceMappingURL=prescription-template.dto.js.map