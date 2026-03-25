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
exports.CreateAttachmentDto = exports.AttachmentType = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var AttachmentType;
(function (AttachmentType) {
    AttachmentType["XRAY"] = "xray";
    AttachmentType["REPORT"] = "report";
    AttachmentType["DOCUMENT"] = "document";
})(AttachmentType || (exports.AttachmentType = AttachmentType = {}));
class CreateAttachmentDto {
    branch_id;
    patient_id;
    file_url;
    type;
    uploaded_by;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, patient_id: { required: true, type: () => String, format: "uuid" }, file_url: { required: true, type: () => String, maxLength: 1000 }, type: { required: true, enum: require("./create-attachment.dto").AttachmentType }, uploaded_by: { required: true, type: () => String, format: "uuid" } };
    }
}
exports.CreateAttachmentDto = CreateAttachmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Branch ID', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAttachmentDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Patient ID', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAttachmentDto.prototype, "patient_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File URL or storage path', maxLength: 1000 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateAttachmentDto.prototype, "file_url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Attachment type', enum: AttachmentType }),
    (0, class_validator_1.IsEnum)(AttachmentType),
    __metadata("design:type", String)
], CreateAttachmentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User ID who uploaded', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAttachmentDto.prototype, "uploaded_by", void 0);
//# sourceMappingURL=create-attachment.dto.js.map