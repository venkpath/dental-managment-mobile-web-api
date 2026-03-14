import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditLog, Prisma } from '@prisma/client';
import { QueryAuditLogDto } from './dto/index.js';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';

export interface CreateAuditLogInput {
  clinic_id: string;
  user_id?: string;
  action: string;
  entity: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        clinic_id: input.clinic_id,
        user_id: input.user_id ?? null,
        action: input.action,
        entity: input.entity,
        entity_id: input.entity_id,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async findOne(clinicId: string, id: string): Promise<AuditLog> {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log || log.clinic_id !== clinicId) {
      throw new NotFoundException(`Audit log with ID "${id}" not found`);
    }
    return log;
  }

  async findByClinic(
    clinicId: string,
    query: QueryAuditLogDto,
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = { clinic_id: clinicId };

    if (query.entity) {
      where.entity = query.entity;
    }

    if (query.entity_id) {
      where.entity_id = query.entity_id;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.user_id) {
      where.user_id = query.user_id;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }
}
