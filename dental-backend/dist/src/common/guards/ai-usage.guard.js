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
exports.AiUsageGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const track_ai_usage_decorator_js_1 = require("../decorators/track-ai-usage.decorator.js");
const DEFAULT_AI_QUOTA = 500;
let AiUsageGuard = class AiUsageGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const trackUsage = this.reflector.getAllAndOverride(track_ai_usage_decorator_js_1.TRACK_AI_USAGE_KEY, [context.getHandler(), context.getClass()]);
        if (!trackUsage) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        if (request.superAdmin) {
            return true;
        }
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Authentication required');
        }
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: user.clinicId },
            select: { id: true, plan_id: true, ai_quota_override: true, ai_usage_count: true },
        });
        if (!clinic || !clinic.plan_id) {
            throw new common_1.ForbiddenException('AI features require an active subscription plan');
        }
        const effectiveQuota = await this.resolveQuota(clinic.ai_quota_override);
        if (effectiveQuota > 0) {
            const result = await this.prisma.clinic.updateMany({
                where: {
                    id: clinic.id,
                    ai_usage_count: { lt: effectiveQuota },
                },
                data: { ai_usage_count: { increment: 1 } },
            });
            if (result.count === 0) {
                throw new common_1.ForbiddenException(`AI usage quota exceeded (${effectiveQuota} requests). Contact your administrator to increase the limit.`);
            }
        }
        else {
            await this.prisma.clinic.update({
                where: { id: clinic.id },
                data: { ai_usage_count: { increment: 1 } },
            });
        }
        return true;
    }
    async resolveQuota(clinicOverride) {
        if (clinicOverride !== null && clinicOverride !== undefined) {
            return clinicOverride;
        }
        try {
            const globalSetting = await this.prisma.globalSetting.findUnique({
                where: { key: 'global_ai_quota' },
            });
            if (globalSetting?.value) {
                const parsed = parseInt(globalSetting.value, 10);
                if (!isNaN(parsed)) {
                    return parsed;
                }
            }
        }
        catch {
        }
        return DEFAULT_AI_QUOTA;
    }
};
exports.AiUsageGuard = AiUsageGuard;
exports.AiUsageGuard = AiUsageGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_js_1.PrismaService])
], AiUsageGuard);
//# sourceMappingURL=ai-usage.guard.js.map