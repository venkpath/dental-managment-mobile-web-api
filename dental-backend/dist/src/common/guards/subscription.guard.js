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
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_js_1 = require("../decorators/public.decorator.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let SubscriptionGuard = class SubscriptionGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_js_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.clinicId)
            return true;
        const path = request.originalUrl || request.url || '';
        if (path.includes('/payment') || path.includes('/auth'))
            return true;
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: user.clinicId },
            select: { subscription_status: true, trial_ends_at: true },
        });
        if (!clinic)
            return true;
        const { subscription_status, trial_ends_at } = clinic;
        if (subscription_status === 'active' || subscription_status === 'created') {
            return true;
        }
        if (subscription_status === 'trial') {
            if (trial_ends_at && new Date(trial_ends_at) > new Date()) {
                return true;
            }
            throw new common_1.ForbiddenException('Your 14-day free trial has ended. Please subscribe to a plan to continue using the application.');
        }
        throw new common_1.ForbiddenException('Your subscription is inactive. Please subscribe to a plan to continue using the application.');
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_js_1.PrismaService])
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map