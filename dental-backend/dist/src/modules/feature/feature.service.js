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
exports.FeatureService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let FeatureService = class FeatureService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.feature.findUnique({ where: { key: dto.key } });
        if (existing) {
            throw new common_1.ConflictException(`Feature with key "${dto.key}" already exists`);
        }
        return this.prisma.feature.create({ data: dto });
    }
    async findAll() {
        return this.prisma.feature.findMany({
            orderBy: { key: 'asc' },
        });
    }
    async remove(id) {
        const feature = await this.prisma.feature.findUnique({ where: { id } });
        if (!feature) {
            throw new common_1.ConflictException(`Feature with ID "${id}" not found`);
        }
        return this.prisma.feature.delete({ where: { id } });
    }
};
exports.FeatureService = FeatureService;
exports.FeatureService = FeatureService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], FeatureService);
//# sourceMappingURL=feature.service.js.map