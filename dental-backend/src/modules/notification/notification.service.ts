import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { Notification, Prisma } from '@prisma/client';
import { QueryNotificationDto } from './dto/index.js';
import {
  PaginatedResult,
  paginate,
} from '../../common/interfaces/paginated-result.interface.js';

export interface CreateNotificationInput {
  clinic_id: string;
  user_id?: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        clinic_id: input.clinic_id,
        user_id: input.user_id ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<number> {
    const result = await this.prisma.notification.createMany({
      data: inputs.map((input) => ({
        clinic_id: input.clinic_id,
        user_id: input.user_id ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
      })),
    });
    return result.count;
  }

  async findByClinicAndUser(
    clinicId: string,
    userId: string,
    query: QueryNotificationDto,
  ): Promise<PaginatedResult<Notification>> {
    const where: Prisma.NotificationWhereInput = {
      clinic_id: clinicId,
      OR: [{ user_id: userId }, { user_id: null }],
    };

    if (query.type) where.type = query.type;
    if (query.is_read !== undefined) where.is_read = query.is_read;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getUnreadCount(clinicId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        clinic_id: clinicId,
        OR: [{ user_id: userId }, { user_id: null }],
        is_read: false,
      },
    });
  }

  async markAsRead(clinicId: string, id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification || notification.clinic_id !== clinicId) {
      throw new NotFoundException(`Notification "${id}" not found`);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });
  }

  async markAllAsRead(clinicId: string, userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        clinic_id: clinicId,
        OR: [{ user_id: userId }, { user_id: null }],
        is_read: false,
      },
      data: { is_read: true },
    });
    return result.count;
  }
}
