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
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let HealthService = class HealthService {
    health;
    memory;
    disk;
    prisma;
    constructor(health, memory, disk, prisma) {
        this.health = health;
        this.memory = memory;
        this.disk = disk;
        this.prisma = prisma;
    }
    check() {
        return { status: 'ok' };
    }
    async checkDetailed() {
        return this.health.check([
            async () => {
                try {
                    await this.prisma.$queryRaw `SELECT 1`;
                    return { database: { status: 'up' } };
                }
                catch {
                    return { database: { status: 'down' } };
                }
            },
            () => this.memory.checkHeap('memory_heap', 256 * 1024 * 1024),
            () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),
            () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
        ]);
    }
    async checkReady() {
        return this.health.check([
            async () => {
                try {
                    await this.prisma.$queryRaw `SELECT 1`;
                    return { database: { status: 'up' } };
                }
                catch {
                    return { database: { status: 'down' } };
                }
            },
        ]);
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        terminus_1.MemoryHealthIndicator,
        terminus_1.DiskHealthIndicator,
        prisma_service_js_1.PrismaService])
], HealthService);
//# sourceMappingURL=health.service.js.map