import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { paginate } from '../../common/interfaces/paginated-result.interface.js';
import { TemplateRenderer } from './template-renderer.js';
import type { CreateTemplateDto } from './dto/create-template.dto.js';
import type { UpdateTemplateDto } from './dto/update-template.dto.js';
import type { QueryTemplateDto } from './dto/query-template.dto.js';
import type { TemplateVariables } from './template-renderer.js';

@Injectable()
export class TemplateService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: TemplateRenderer,
  ) {}

  async create(clinicId: string, dto: CreateTemplateDto) {
    // Auto-extract variables from body if not provided
    const variables = dto.variables || this.renderer.extractVariables(dto.body);

    return this.prisma.messageTemplate.create({
      data: {
        clinic_id: clinicId,
        channel: dto.channel,
        category: dto.category,
        template_name: dto.template_name,
        subject: dto.subject,
        body: dto.body,
        variables: variables,
        language: dto.language || 'en',
        is_active: dto.is_active ?? true,
        dlt_template_id: dto.dlt_template_id,
      },
    });
  }

  async findAll(clinicId: string, query: QueryTemplateDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.MessageTemplateWhereInput = {
      OR: [{ clinic_id: clinicId }, { clinic_id: null }], // clinic + system templates
    };

    if (query.channel) where.channel = query.channel;
    if (query.category) where.category = query.category;
    if (query.language) where.language = query.language;
    if (query.search) {
      where.template_name = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.messageTemplate.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.messageTemplate.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        id,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    return template;
  }

  async update(clinicId: string, id: string, dto: UpdateTemplateDto) {
    // Only allow updating clinic-owned templates (not system templates)
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, clinic_id: clinicId },
    });

    if (!template) {
      throw new NotFoundException(
        `Template with ID "${id}" not found or is a system template that cannot be modified`,
      );
    }

    // Re-extract variables if body changed
    const variables = dto.body
      ? this.renderer.extractVariables(dto.body)
      : undefined;

    return this.prisma.messageTemplate.update({
      where: { id },
      data: {
        ...dto,
        variables: variables ?? undefined,
      },
    });
  }

  async remove(clinicId: string, id: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, clinic_id: clinicId },
    });

    if (!template) {
      throw new NotFoundException(
        `Template with ID "${id}" not found or is a system template that cannot be deleted`,
      );
    }

    await this.prisma.messageTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Find a template by name, channel, and language — with fallback to 'en'
   */
  async findByName(
    clinicId: string,
    templateName: string,
    channel: string,
    language: string = 'en',
  ) {
    // Try patient's language first
    let template = await this.prisma.messageTemplate.findFirst({
      where: {
        template_name: templateName,
        channel: { in: [channel, 'all'] },
        language,
        is_active: true,
        OR: [{ clinic_id: clinicId }, { clinic_id: null }],
      },
      orderBy: { clinic_id: 'desc' }, // clinic templates take priority over system
    });

    // Fallback to English
    if (!template && language !== 'en') {
      template = await this.prisma.messageTemplate.findFirst({
        where: {
          template_name: templateName,
          channel: { in: [channel, 'all'] },
          language: 'en',
          is_active: true,
          OR: [{ clinic_id: clinicId }, { clinic_id: null }],
        },
        orderBy: { clinic_id: 'desc' },
      });
    }

    return template;
  }

  /**
   * Render a template with variables
   */
  renderTemplate(templateBody: string, variables: TemplateVariables): string {
    return this.renderer.render(templateBody, variables);
  }
}
