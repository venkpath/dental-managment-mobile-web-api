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
exports.WhatsAppEmbeddedSignupDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class WhatsAppEmbeddedSignupDto {
    code;
    accessToken;
    phoneNumberId;
    wabaId;
    redirectUri;
    static _OPENAPI_METADATA_FACTORY() {
        return { code: { required: false, type: () => String }, accessToken: { required: false, type: () => String }, phoneNumberId: { required: false, type: () => String }, wabaId: { required: false, type: () => String }, redirectUri: { required: false, type: () => String } };
    }
}
exports.WhatsAppEmbeddedSignupDto = WhatsAppEmbeddedSignupDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Authorization code from Meta Embedded Signup popup', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WhatsAppEmbeddedSignupDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Access token returned directly from Meta Embedded Signup popup', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WhatsAppEmbeddedSignupDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Phone Number ID from session logging message event', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WhatsAppEmbeddedSignupDto.prototype, "phoneNumberId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'WABA ID from session logging message event', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WhatsAppEmbeddedSignupDto.prototype, "wabaId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Redirect URI (page URL) used during FB.login popup — required for code exchange', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WhatsAppEmbeddedSignupDto.prototype, "redirectUri", void 0);
//# sourceMappingURL=whatsapp-embedded-signup.dto.js.map