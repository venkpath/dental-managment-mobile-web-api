import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { TemplateRenderer } from '../communication/template-renderer.js';
import { PLATFORM_TEMPLATE_NAMES } from '../communication/platform-templates.js';
import { getWhatsAppSeedSampleValues } from '../communication/seed-templates.js';

/**
 * Super-admin-only service for editing platform/system-level WhatsApp
 * templates (e.g. SaaS billing reminders, demo confirmations).
 *
 * These templates have `clinic_id = null` and a `template_name` listed in
 * `PLATFORM_TEMPLATE_NAMES`. They are intentionally hidden from clinic
 * UIs — only super admins manage them.
 *
 * Scope intentionally narrow:
 *   - list / get / update only
 *   - no create / delete (seeded once via the platform seed pass)
 *   - body edits re-extract variables for the {{1}}, {{2}}, ... mapping
 */
@Injectable()
export class PlatformTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: TemplateRenderer,
  ) {}

  async list() {
    const templates = await this.prisma.messageTemplate.findMany({
      where: {
        clinic_id: null,
        template_name: { in: [...PLATFORM_TEMPLATE_NAMES] },
      },
      orderBy: { template_name: 'asc' },
    });

    return templates.map((t) => ({
      ...t,
      sampleValues: getWhatsAppSeedSampleValues(t.template_name) ?? {},
    }));
  }

  async get(id: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, clinic_id: null },
    });
    if (!template || !this.isPlatformTemplate(template.template_name)) {
      throw new NotFoundException('Platform template not found');
    }
    return {
      ...template,
      sampleValues: getWhatsAppSeedSampleValues(template.template_name) ?? {},
    };
  }

  async update(
    id: string,
    dto: { body?: string; subject?: string; language?: string; is_active?: boolean; category?: string },
  ) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, clinic_id: null },
    });
    if (!template || !this.isPlatformTemplate(template.template_name)) {
      throw new NotFoundException('Platform template not found');
    }

    if (dto.body !== undefined && !dto.body.trim()) {
      throw new BadRequestException('body must not be empty');
    }

    // Re-extract variables from new body so the {{1}}, {{2}} provider
    // mapping stays in sync with the template text.
    let variables: { body: string[]; buttons: never[] } | undefined;
    if (dto.body !== undefined) {
      const extracted = this.renderer.extractVariables(dto.body);
      variables = { body: extracted, buttons: [] };
    }

    const updated = await this.prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(variables !== undefined && { variables }),
      },
    });

    return updated;
  }

  /**
   * Render a template body with sample values so the super admin can
   * preview before saving / submitting to Meta.
   */
  preview(body: string, sampleValues: Record<string, string>) {
    const rendered = this.renderer.render(body, sampleValues);
    const variables = this.renderer.extractVariables(body);
    return { rendered, variables };
  }

  private isPlatformTemplate(templateName: string): boolean {
    return (PLATFORM_TEMPLATE_NAMES as readonly string[]).includes(templateName);
  }
}
