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
exports.PlanService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let PlanService = class PlanService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.plan.findUnique({ where: { name: dto.name } });
        if (existing) {
            throw new common_1.ConflictException(`Plan with name "${dto.name}" already exists`);
        }
        return this.prisma.plan.create({ data: dto });
    }
    async findAll() {
        return this.prisma.plan.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                plan_features: { include: { feature: true } },
            },
        });
    }
    async findOne(id) {
        const plan = await this.prisma.plan.findUnique({ where: { id } });
        if (!plan) {
            throw new common_1.NotFoundException(`Plan with ID "${id}" not found`);
        }
        return plan;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.name) {
            const existing = await this.prisma.plan.findUnique({ where: { name: dto.name } });
            if (existing && existing.id !== id) {
                throw new common_1.ConflictException(`Plan with name "${dto.name}" already exists`);
            }
        }
        return this.prisma.plan.update({
            where: { id },
            data: dto,
        });
    }
    async assignFeatures(planId, dto) {
        await this.findOne(planId);
        const featureIds = dto.features.map((f) => f.feature_id);
        const existingFeatures = await this.prisma.feature.findMany({
            where: { id: { in: featureIds } },
            select: { id: true },
        });
        const existingIds = new Set(existingFeatures.map((f) => f.id));
        const missingIds = featureIds.filter((id) => !existingIds.has(id));
        if (missingIds.length > 0) {
            throw new common_1.NotFoundException(`Features not found: ${missingIds.join(', ')}`);
        }
        const results = [];
        for (const item of dto.features) {
            const result = await this.prisma.planFeature.upsert({
                where: {
                    plan_id_feature_id: { plan_id: planId, feature_id: item.feature_id },
                },
                update: { is_enabled: item.is_enabled ?? true },
                create: {
                    plan_id: planId,
                    feature_id: item.feature_id,
                    is_enabled: item.is_enabled ?? true,
                },
            });
            results.push(result);
        }
        return results;
    }
    async getFeatures(planId) {
        await this.findOne(planId);
        return this.prisma.planFeature.findMany({
            where: { plan_id: planId },
            include: { feature: true },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.plan.delete({ where: { id } });
    }
};
exports.PlanService = PlanService;
exports.PlanService = PlanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], PlanService);
//# sourceMappingURL=plan.service.js.map