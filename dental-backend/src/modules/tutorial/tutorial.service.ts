import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import type {
  CreateTutorialDto,
  UpdateTutorialDto,
  UpdateProgressDto,
} from './dto/index.js';

const TUTORIAL_PREFIX = 'tutorials/';

@Injectable()
export class TutorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  // ---------- Super-admin: management ----------

  async createTutorial(dto: CreateTutorialDto) {
    this.assertKeyInPrefix(dto.s3_key);
    if (dto.thumbnail_s3_key) this.assertKeyInPrefix(dto.thumbnail_s3_key);

    const exists = await this.s3.objectExists(dto.s3_key);
    if (!exists) {
      throw new BadRequestException(
        `Object not found at S3 key "${dto.s3_key}". Upload the file to S3 first.`,
      );
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

  async updateTutorial(id: string, dto: UpdateTutorialDto) {
    const existing = await this.prisma.tutorial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tutorial not found');

    if (dto.s3_key && dto.s3_key !== existing.s3_key) {
      this.assertKeyInPrefix(dto.s3_key);
      const exists = await this.s3.objectExists(dto.s3_key);
      if (!exists) {
        throw new BadRequestException(
          `Object not found at S3 key "${dto.s3_key}".`,
        );
      }
    }
    if (dto.thumbnail_s3_key) this.assertKeyInPrefix(dto.thumbnail_s3_key);

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

  async deleteTutorial(id: string) {
    const existing = await this.prisma.tutorial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tutorial not found');
    await this.prisma.tutorial.delete({ where: { id } });
    return { deleted: true };
  }

  // ---------- Clinic users: viewing ----------

  async listForUser(userId: string, userRole: string) {
    const role = userRole.toLowerCase();
    const tutorials = await this.prisma.tutorial.findMany({
      where: {
        is_published: true,
        allowed_roles: { has: role },
      },
      orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
    });

    if (tutorials.length === 0) return [];

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

  async getStreamUrl(tutorialId: string, userId: string, userRole: string) {
    const tutorial = await this.prisma.tutorial.findUnique({
      where: { id: tutorialId },
    });
    if (!tutorial || !tutorial.is_published) {
      throw new NotFoundException('Tutorial not found');
    }
    if (!this.canUserAccess(tutorial.allowed_roles, userRole)) {
      throw new NotFoundException('Tutorial not found');
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

  async updateProgress(
    tutorialId: string,
    userId: string,
    userRole: string,
    dto: UpdateProgressDto,
  ) {
    const tutorial = await this.prisma.tutorial.findUnique({
      where: { id: tutorialId },
    });
    if (!tutorial || !tutorial.is_published) {
      throw new NotFoundException('Tutorial not found');
    }
    if (!this.canUserAccess(tutorial.allowed_roles, userRole)) {
      throw new NotFoundException('Tutorial not found');
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

  // ---------- helpers ----------

  private normalizeRoles(roles: string[]): string[] {
    const cleaned = roles
      .map((r) => r.trim().toLowerCase())
      .filter((r) => r.length > 0);
    return Array.from(new Set(cleaned));
  }

  private canUserAccess(allowedRoles: string[], userRole: string): boolean {
    const role = userRole.toLowerCase();
    // SuperAdmin sees everything (matches platform-wide RolesGuard convention)
    if (role === 'superadmin') return true;
    return allowedRoles.includes(role);
  }

  private assertKeyInPrefix(key: string) {
    if (!key.startsWith(TUTORIAL_PREFIX)) {
      throw new BadRequestException(
        `S3 key must start with "${TUTORIAL_PREFIX}"`,
      );
    }
  }
}
