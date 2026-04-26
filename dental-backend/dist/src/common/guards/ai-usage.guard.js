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
const track_ai_usage_decorator_js_1 = require("../decorators/track-ai-usage.decorator.js");
const ai_usage_service_js_1 = require("../../modules/ai/ai-usage.service.js");
let AiUsageGuard = class AiUsageGuard {
    reflector;
    aiUsageService;
    constructor(reflector, aiUsageService) {
        this.reflector = reflector;
        this.aiUsageService = aiUsageService;
    }
    async canActivate(context) {
        const trackUsage = this.reflector.getAllAndOverride(track_ai_usage_decorator_js_1.TRACK_AI_USAGE_KEY, [context.getHandler(), context.getClass()]);
        if (!trackUsage)
            return true;
        const request = context.switchToHttp().getRequest();
        if (request.superAdmin)
            return true;
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Authentication required');
        }
        await this.aiUsageService.reserveSlot(user.clinicId);
        return true;
    }
};
exports.AiUsageGuard = AiUsageGuard;
exports.AiUsageGuard = AiUsageGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        ai_usage_service_js_1.AiUsageService])
], AiUsageGuard);
//# sourceMappingURL=ai-usage.guard.js.map