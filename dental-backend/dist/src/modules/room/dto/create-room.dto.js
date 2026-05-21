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
exports.CreateRoomDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateRoomDto {
    branch_id;
    name;
    room_type;
    sort_order;
    notes;
    is_active;
    static _OPENAPI_METADATA_FACTORY() {
        return { branch_id: { required: true, type: () => String, format: "uuid" }, name: { required: true, type: () => String, maxLength: 100 }, room_type: { required: false, type: () => String, enum: ['operatory', 'consultation', 'xray', 'surgery'] }, sort_order: { required: false, type: () => Number, minimum: 0 }, notes: { required: false, type: () => String }, is_active: { required: false, type: () => Boolean } };
    }
}
exports.CreateRoomDto = CreateRoomDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-of-branch' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "branch_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Room 1' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'operatory', enum: ['operatory', 'consultation', 'xray', 'surgery'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['operatory', 'consultation', 'xray', 'surgery']),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "room_type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRoomDto.prototype, "sort_order", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Has digital X-ray sensor' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateRoomDto.prototype, "is_active", void 0);
//# sourceMappingURL=create-room.dto.js.map