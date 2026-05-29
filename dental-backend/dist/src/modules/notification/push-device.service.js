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
exports.PushDeviceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let PushDeviceService = class PushDeviceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async register(userId, dto) {
        await this.prisma.pushDeviceToken.upsert({
            where: { token: dto.token },
            create: {
                user_id: userId,
                token: dto.token,
                platform: dto.platform ?? null,
                device_id: dto.device_id ?? null,
            },
            update: {
                user_id: userId,
                platform: dto.platform ?? null,
                device_id: dto.device_id ?? null,
                updated_at: new Date(),
            },
        });
    }
    async unregister(userId, token) {
        await this.prisma.pushDeviceToken.deleteMany({
            where: { user_id: userId, token },
        });
    }
    async unregisterAllForUser(userId) {
        await this.prisma.pushDeviceToken.deleteMany({
            where: { user_id: userId },
        });
    }
    async getTokensForUser(userId) {
        const rows = await this.prisma.pushDeviceToken.findMany({
            where: { user_id: userId },
            select: { token: true },
        });
        return rows.map((r) => r.token);
    }
};
exports.PushDeviceService = PushDeviceService;
exports.PushDeviceService = PushDeviceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], PushDeviceService);
//# sourceMappingURL=push-device.service.js.map