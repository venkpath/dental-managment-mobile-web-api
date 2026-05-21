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
exports.AssignRoomDto = exports.UpdateRoomStatusDto = exports.UpdateRoomDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const create_room_dto_js_1 = require("./create-room.dto.js");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
class UpdateRoomDto extends (0, swagger_1.PartialType)(create_room_dto_js_1.CreateRoomDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateRoomDto = UpdateRoomDto;
class UpdateRoomStatusDto {
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: true, type: () => String, enum: ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'] } };
    }
}
exports.UpdateRoomStatusDto = UpdateRoomStatusDto;
__decorate([
    (0, swagger_2.ApiPropertyOptional)({
        example: 'occupied',
        enum: ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['available', 'occupied', 'cleaning', 'maintenance', 'reserved']),
    __metadata("design:type", String)
], UpdateRoomStatusDto.prototype, "status", void 0);
class AssignRoomDto {
    appointment_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { appointment_id: { required: false, type: () => String, nullable: true } };
    }
}
exports.AssignRoomDto = AssignRoomDto;
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'uuid-of-appointment' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], AssignRoomDto.prototype, "appointment_id", void 0);
//# sourceMappingURL=update-room.dto.js.map