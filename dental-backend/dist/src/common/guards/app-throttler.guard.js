"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const throttler_constants_js_1 = require("@nestjs/throttler/dist/throttler.constants.js");
let AppThrottlerGuard = class AppThrottlerGuard extends throttler_1.ThrottlerGuard {
    async shouldSkip(context) {
        const handler = context.getHandler();
        const classRef = context.getClass();
        const skip = this.reflector.getAllAndOverride(throttler_constants_js_1.THROTTLER_SKIP, [handler, classRef]);
        if (skip === true)
            return true;
        for (const namedThrottler of this.throttlers) {
            const limit = this.reflector.getAllAndOverride(throttler_constants_js_1.THROTTLER_LIMIT + namedThrottler.name, [handler, classRef]);
            if (limit != null)
                return false;
        }
        return true;
    }
    async getTracker(req) {
        const request = req;
        const user = request.user;
        if (user?.userId) {
            const clinic = user.clinicId ?? 'no-clinic';
            return `user:${user.userId}:clinic:${clinic}`;
        }
        const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.ip ||
            request.socket?.remoteAddress ||
            'unknown';
        return `ip:${ip}`;
    }
};
exports.AppThrottlerGuard = AppThrottlerGuard;
exports.AppThrottlerGuard = AppThrottlerGuard = __decorate([
    (0, common_1.Injectable)()
], AppThrottlerGuard);
//# sourceMappingURL=app-throttler.guard.js.map