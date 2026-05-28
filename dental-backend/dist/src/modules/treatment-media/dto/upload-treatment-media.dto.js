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
exports.UploadTreatmentMediaDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UploadTreatmentMediaDto {
    media_type;
    branch_id;
    visit_date;
    caption;
    static _OPENAPI_METADATA_FACTORY() {
        return { media_type: { required: true, type: () => String, enum: ['photo', 'xray', 'report', 'document'] }, branch_id: { required: true, type: () => String }, visit_date: { required: true, type: () => String }, caption: { required: false, type: () => String } };
    }
}
exports.UploadTreatmentMediaDto = UploadTreatmentMediaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['photo', 'xray', 'report', 'document'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['photo', 'xray', 'report', 'document']),
    __metadata("design:type", String)
], UploadTreatmentMediaDto.prototype, "media_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch UUID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadTreatmentMediaDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Visit date (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UploadTreatmentMediaDto.prototype, "visit_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional caption' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadTreatmentMediaDto.prototype, "caption", void 0);
//# sourceMappingURL=upload-treatment-media.dto.js.map