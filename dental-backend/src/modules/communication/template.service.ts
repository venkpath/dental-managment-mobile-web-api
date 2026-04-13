import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { paginate } from '../../common/interfaces/paginated-result.interface.js';
import { TemplateRenderer } from './template-renderer.js';
import type { CreateTemplateDto } from './dto/create-template.dto.js';
import type { UpdateTemplateDto } from './dto/update-template.dto.js';
import type { QueryTemplateDto } from './dto/query-template.dto.js';
import type { TemplateVariables } from './template-renderer.js';
import { getWhatsAppSeedSampleValues, getWhatsAppSeedMetaCategory } from './seed-templates.js';

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
   * List all Smart Dental Desk base WhatsApp templates (system templates, clinic_id = null, channel = whatsapp).
   * These are pre-approved templates that clinics can submit to their own WABA.
   * Enriched with sampleValues and metaCategory from the seed definitions.
   */
  async getBaseWhatsAppTemplates() {
    const templates = await this.prisma.messageTemplate.findMany({
      where: { clinic_id: null, channel: 'whatsapp', is_active: true },
      orderBy: { template_name: 'asc' },
    });

    return templates.map((t) => ({
      ...t,
      sampleValues: getWhatsAppSeedSampleValues(t.template_name) ?? {},
      metaCategory: getWhatsAppSeedMetaCategory(t.template_name),
    }));
  }

  /**
   * Check whether a clinic already has a WhatsApp template with the given name.
   */
  async clinicHasWhatsAppTemplate(clinicId: string, templateName: string): Promise<boolean> {
    const count = await this.prisma.messageTemplate.count({
      where: { clinic_id: clinicId, template_name: templateName, channel: 'whatsapp' },
    });
    return count > 0;
  }

  /**
   * Clone a base WhatsApp template and create a clinic-owned copy,
   * returning data ready to submit to Meta for approval.
   * Does NOT submit to Meta — the controller calls submitWhatsAppTemplate separately.
   */
  async cloneBaseTemplateForClinic(clinicId: string, baseTemplateId: string) {
    const base = await this.prisma.messageTemplate.findFirst({
      where: { id: baseTemplateId, clinic_id: null, channel: 'whatsapp' },
    });

    if (!base) {
      throw new NotFoundException(`Base WhatsApp template "${baseTemplateId}" not found`);
    }

    // Check if clinic already has this template
    const existing = await this.prisma.messageTemplate.findFirst({
      where: { clinic_id: clinicId, template_name: base.template_name, channel: 'whatsapp', language: base.language },
    });

    if (existing) {
      return { cloned: false, template: existing, message: 'You already have this template. Use the existing one.' };
    }

    const cloned = await this.prisma.messageTemplate.create({
      data: {
        clinic_id: clinicId,
        channel: 'whatsapp',
        category: base.category,
        template_name: base.template_name,
        subject: base.subject,
        body: base.body,
        variables: base.variables ?? undefined,
        language: base.language,
        is_active: false,
        whatsapp_template_status: 'draft',
      } as any,
    });

    return {
      cloned: true,
      template: cloned,
      submit_hint: `Submit this template to Meta using POST /communication/whatsapp/templates/submit with elementName="${base.template_name}"`,
    };
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
