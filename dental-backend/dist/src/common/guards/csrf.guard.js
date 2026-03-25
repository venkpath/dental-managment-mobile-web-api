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
exports.CsrfGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const crypto_1 = require("crypto");
const public_decorator_js_1 = require("../decorators/public.decorator.js");
const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
let CsrfGuard = class CsrfGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_js_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer '))
            return true;
        if (SAFE_METHODS.has(request.method)) {
            this.ensureCsrfCookie(request);
            return true;
        }
        const cookieToken = request.cookies?.[CSRF_COOKIE];
        const headerToken = request.headers[CSRF_HEADER];
        if (!cookieToken || !headerToken) {
            throw new common_1.ForbiddenException('CSRF token missing');
        }
        if (cookieToken !== headerToken) {
            throw new common_1.ForbiddenException('CSRF token mismatch');
        }
        return true;
    }
    ensureCsrfCookie(request) {
        const res = request.res;
        if (!request.cookies?.[CSRF_COOKIE] && res) {
            const token = (0, crypto_1.randomBytes)(32).toString('hex');
            res.cookie(CSRF_COOKIE, token, {
                httpOnly: false,
                secure: process.env['NODE_ENV'] === 'production',
                sameSite: 'strict',
                path: '/',
            });
        }
    }
};
exports.CsrfGuard = CsrfGuard;
exports.CsrfGuard = CsrfGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], CsrfGuard);
//# sourceMappingURL=csrf.guard.js.map