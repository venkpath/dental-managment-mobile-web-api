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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsrfController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const crypto_1 = require("crypto");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
let CsrfController = class CsrfController {
    getToken(res) {
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        res.cookie('csrf-token', token, {
            httpOnly: false,
            secure: process.env['NODE_ENV'] === 'production',
            sameSite: 'strict',
            path: '/',
        });
        return { token };
    }
};
exports.CsrfController = CsrfController;
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Get)('token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get CSRF token', description: 'Sets a CSRF cookie and returns the token value' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], CsrfController.prototype, "getToken", null);
exports.CsrfController = CsrfController = __decorate([
    (0, swagger_1.ApiTags)('CSRF'),
    (0, common_1.Controller)('csrf')
], CsrfController);
//# sourceMappingURL=csrf.controller.js.map