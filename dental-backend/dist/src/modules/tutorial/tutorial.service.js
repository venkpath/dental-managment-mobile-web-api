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
exports.TutorialService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const TUTORIAL_PREFIX = 'tutorials/';
let TutorialService = class TutorialService {
    prisma;
    s3;
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
    }
    async createTutorial(dto) {
        this.assertKeyInPrefix(dto.s3_key);
        if (dto.thumbnail_s3_key)
            this.assertKeyInPrefix(dto.thumbnail_s3_key);
        const exists = await this.s3.objectExists(dto.s3_key);
        if (!exists) {
            throw new common_1.BadRequestException(`Object not found at S3 key "${dto.s3_key}". Upload the file to S3 first.`);
        }
        return this.prisma.tutorial.create({
            data: {
                title: dto.title,
                description: dto.description,
                s3_key: dto.s3_key,
                thumbnail_s3_key: dto.thumbnail_s3_key,
                duration_seconds: dto.duration_seconds,
                category: dto.category,
                display_order: dto.display_order ?? 0,
                allowed_roles: this.normalizeRoles(dto.allowed_roles),
                is_published: dto.is_published ?? true,
            },
        });
    }
    async listAllForAdmin() {
        return this.prisma.tutorial.findMany({
            orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
        });
    }
    async updateTutorial(id, dto) {
        const existing = await this.prisma.tutorial.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Tutorial not found');
        if (dto.s3_key && dto.s3_key !== existing.s3_key) {
            this.assertKeyInPrefix(dto.s3_key);
            const exists = await this.s3.objectExists(dto.s3_key);
            if (!exists) {
                throw new common_1.BadRequestException(`Object not found at S3 key "${dto.s3_key}".`);
            }
        }
        if (dto.thumbnail_s3_key)
            this.assertKeyInPrefix(dto.thumbnail_s3_key);
        return this.prisma.tutorial.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                s3_key: dto.s3_key,
                thumbnail_s3_key: dto.thumbnail_s3_key,
                duration_seconds: dto.duration_seconds,
                category: dto.category,
                display_order: dto.display_order,
                allowed_roles: dto.allowed_roles
                    ? this.normalizeRoles(dto.allowed_roles)
                    : undefined,
                is_published: dto.is_published,
            },
        });
    }
    async deleteTutorial(id) {
        const existing = await this.prisma.tutorial.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Tutorial not found');
        await this.prisma.tutorial.delete({ where: { id } });
        return { deleted: true };
    }
    async listForUser(userId, userRole) {
        const role = userRole.toLowerCase();
        const where = role === 'superadmin'
            ? { is_published: true }
            : { is_published: true, allowed_roles: { has: role } };
        const tutorials = await this.prisma.tutorial.findMany({
            where,
            orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
        });
        if (tutorials.length === 0)
            return [];
        const progress = await this.prisma.tutorialProgress.findMany({
            where: {
                user_id: userId,
                tutorial_id: { in: tutorials.map((t) => t.id) },
            },
        });
        const progressMap = new Map(progress.map((p) => [p.tutorial_id, p]));
        return tutorials.map((t) => {
            const p = progressMap.get(t.id);
            return {
                id: t.id,
                title: t.title,
                description: t.description,
                thumbnail_s3_key: t.thumbnail_s3_key,
                duration_seconds: t.duration_seconds,
                category: t.category,
                display_order: t.display_order,
                last_position_seconds: p?.last_position_seconds ?? 0,
                completed_at: p?.completed_at ?? null,
            };
        });
    }
    async getStreamUrl(tutorialId, userId, userRole) {
        const tutorial = await this.prisma.tutorial.findUnique({
            where: { id: tutorialId },
        });
        if (!tutorial || !tutorial.is_published) {
            throw new common_1.NotFoundException('Tutorial not found');
        }
        if (!this.canUserAccess(tutorial.allowed_roles, userRole)) {
            throw new common_1.NotFoundException('Tutorial not found');
        }
        const [videoUrl, thumbnailUrl] = await Promise.all([
            this.s3.getSignedUrl(tutorial.s3_key),
            tutorial.thumbnail_s3_key
                ? this.s3.getSignedUrl(tutorial.thumbnail_s3_key)
                : Promise.resolve(null),
        ]);
        const progress = await this.prisma.tutorialProgress.findUnique({
            where: { tutorial_id_user_id: { tutorial_id: tutorialId, user_id: userId } },
        });
        return {
            id: tutorial.id,
            title: tutorial.title,
            description: tutorial.description,
            duration_seconds: tutorial.duration_seconds,
            category: tutorial.category,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            last_position_seconds: progress?.last_position_seconds ?? 0,
            completed_at: progress?.completed_at ?? null,
        };
    }
    async updateProgress(tutorialId, userId, userRole, dto) {
        const tutorial = await this.prisma.tutorial.findUnique({
            where: { id: tutorialId },
        });
        if (!tutorial || !tutorial.is_published) {
            throw new common_1.NotFoundException('Tutorial not found');
        }
        if (!this.canUserAccess(tutorial.allowed_roles, userRole)) {
            throw new common_1.NotFoundException('Tutorial not found');
        }
        const completedAt = dto.completed ? new Date() : undefined;
        return this.prisma.tutorialProgress.upsert({
            where: {
                tutorial_id_user_id: { tutorial_id: tutorialId, user_id: userId },
            },
            create: {
                tutorial_id: tutorialId,
                user_id: userId,
                last_position_seconds: dto.last_position_seconds,
                completed_at: completedAt ?? null,
            },
            update: {
                last_position_seconds: dto.last_position_seconds,
                ...(completedAt ? { completed_at: completedAt } : {}),
            },
        });
    }
    normalizeRoles(roles) {
        const cleaned = roles
            .map((r) => r.trim().toLowerCase())
            .filter((r) => r.length > 0);
        return Array.from(new Set(cleaned));
    }
    canUserAccess(allowedRoles, userRole) {
        const role = userRole.toLowerCase();
        if (role === 'superadmin')
            return true;
        return allowedRoles.includes(role);
    }
    assertKeyInPrefix(key) {
        if (!key.startsWith(TUTORIAL_PREFIX)) {
            throw new common_1.BadRequestException(`S3 key must start with "${TUTORIAL_PREFIX}"`);
        }
    }
};
exports.TutorialService = TutorialService;
exports.TutorialService = TutorialService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        s3_service_js_1.S3Service])
], TutorialService);
//# sourceMappingURL=tutorial.service.js.map