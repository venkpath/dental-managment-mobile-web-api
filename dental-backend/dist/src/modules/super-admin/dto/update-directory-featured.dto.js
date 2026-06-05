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
exports.ReorderFeaturedClinicsDto = exports.UpdateDirectoryFeaturedDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class UpdateDirectoryFeaturedDto {
    featured;
    order;
    static _OPENAPI_METADATA_FACTORY() {
        return { featured: { required: true, type: () => Boolean }, order: { required: false, type: () => Number, minimum: 1, maximum: 999 } };
    }
}
exports.UpdateDirectoryFeaturedDto = UpdateDirectoryFeaturedDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Show this clinic in the homepage Featured Dental Clinics carousel' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDirectoryFeaturedDto.prototype, "featured", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Display order (1 = first). Auto-assigned when enabling if omitted.', minimum: 1, maximum: 999 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(999),
    __metadata("design:type", Number)
], UpdateDirectoryFeaturedDto.prototype, "order", void 0);
class ReorderFeaturedClinicsDto {
    clinic_ids;
    static _OPENAPI_METADATA_FACTORY() {
        return { clinic_ids: { required: true, type: () => [String], format: "uuid" } };
    }
}
exports.ReorderFeaturedClinicsDto = ReorderFeaturedClinicsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String], description: 'Featured clinic IDs in desired display order (first = position 1)' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], ReorderFeaturedClinicsDto.prototype, "clinic_ids", void 0);
//# sourceMappingURL=update-directory-featured.dto.js.map