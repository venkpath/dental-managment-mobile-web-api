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
exports.FeatureGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const require_feature_decorator_js_1 = require("../decorators/require-feature.decorator.js");
let FeatureGuard = class FeatureGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const featureKey = this.reflector.getAllAndOverride(require_feature_decorator_js_1.REQUIRE_FEATURE_KEY, [context.getHandler(), context.getClass()]);
        if (!featureKey) {
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
            select: { plan_id: true },
        });
        if (!clinic || !clinic.plan_id) {
            throw new common_1.ForbiddenException(`Feature "${featureKey}" is not available on your current plan`);
        }
        const planFeature = await this.prisma.planFeature.findFirst({
            where: {
                plan_id: clinic.plan_id,
                feature: { key: featureKey },
                is_enabled: true,
            },
        });
        if (!planFeature) {
            throw new common_1.ForbiddenException(`Feature "${featureKey}" is not available on your current plan`);
        }
        return true;
    }
};
exports.FeatureGuard = FeatureGuard;
exports.FeatureGuard = FeatureGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_js_1.PrismaService])
], FeatureGuard);
//# sourceMappingURL=feature.guard.js.map