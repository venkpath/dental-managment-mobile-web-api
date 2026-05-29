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
exports.UnregisterPushTokenDto = exports.RegisterPushTokenDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RegisterPushTokenDto {
    token;
    platform;
    device_id;
    static _OPENAPI_METADATA_FACTORY() {
        return { token: { required: true, type: () => String, minLength: 10, maxLength: 255 }, platform: { required: false, type: () => Object, enum: ['ios', 'android'] }, device_id: { required: false, type: () => String, maxLength: 100 } };
    }
}
exports.RegisterPushTokenDto = RegisterPushTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Expo push token from the mobile app' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], RegisterPushTokenDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['ios', 'android'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['ios', 'android']),
    __metadata("design:type", String)
], RegisterPushTokenDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Stable device identifier from the client' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], RegisterPushTokenDto.prototype, "device_id", void 0);
class UnregisterPushTokenDto {
    token;
    static _OPENAPI_METADATA_FACTORY() {
        return { token: { required: true, type: () => String, minLength: 10, maxLength: 255 } };
    }
}
exports.UnregisterPushTokenDto = UnregisterPushTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UnregisterPushTokenDto.prototype, "token", void 0);
//# sourceMappingURL=register-push-token.dto.js.map