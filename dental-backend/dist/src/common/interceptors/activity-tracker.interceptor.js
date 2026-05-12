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
exports.ActivityTrackerInterceptor = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const THROTTLE_MS = 60 * 60 * 1000;
let ActivityTrackerInterceptor = class ActivityTrackerInterceptor {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        if (WRITE_METHODS.has(request.method)) {
            const clinicId = request.user?.clinicId;
            if (clinicId) {
                const oneHourAgo = new Date(Date.now() - THROTTLE_MS);
                this.prisma.clinic.updateMany({
                    where: {
                        id: clinicId,
                        is_suspended: false,
                        OR: [
                            { last_active_at: null },
                            { last_active_at: { lt: oneHourAgo } },
                        ],
                    },
                    data: {
                        last_active_at: new Date(),
                        inactivity_reminder_30_sent: false,
                        inactivity_reminder_40_sent: false,
                    },
                }).catch(() => undefined);
            }
        }
        return next.handle();
    }
};
exports.ActivityTrackerInterceptor = ActivityTrackerInterceptor;
exports.ActivityTrackerInterceptor = ActivityTrackerInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ActivityTrackerInterceptor);
//# sourceMappingURL=activity-tracker.interceptor.js.map