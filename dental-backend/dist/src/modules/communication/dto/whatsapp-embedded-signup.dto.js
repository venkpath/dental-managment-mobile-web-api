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
    redirectUri;
    static _OPENAPI_METADATA_FACTORY() {
        return { code: { required: true, type: () => String }, redirectUri: { required: true, type: () => String } };
    }
}
exports.WhatsAppEmbeddedSignupDto = WhatsAppEmbeddedSignupDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Authorization code from Meta Embedded Signup popup' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], WhatsAppEmbeddedSignupDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Page URL where FB.login() was initiated (used as redirect_uri for token exchange)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], WhatsAppEmbeddedSignupDto.prototype, "redirectUri", void 0);
//# sourceMappingURL=whatsapp-embedded-signup.dto.js.map