import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiCreatedResponse, ApiOkResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireFeature } from '../../common/decorators/require-feature.decorator.js';
import { TemplateService } from './template.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';
import { QueryTemplateDto } from './dto/query-template.dto.js';

@ApiTags('Communication - Templates')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@Controller('communication/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get('whatsapp/base')
  @ApiOperation({
    summary: 'List Smart Dental Desk base WhatsApp templates',
    description: 'Pre-approved base templates you can clone and submit to your WABA. Includes sampleValues and metaCategory for each template, plus an `alreadyCreated` flag indicating whether the clinic already has a template with that name.',
  })
  @ApiOkResponse({ description: 'List of base WhatsApp templates with sample data' })
  async getBaseWhatsAppTemplates(@CurrentClinic() clinicId: string) {
    const bases = await this.templateService.getBaseWhatsAppTemplates();

    // Check which ones the clinic already created (for duplicate prevention)
    const enriched = await Promise.all(
      bases.map(async (t) => ({
        ...t,
        alreadyCreated: await this.templateService.clinicHasWhatsAppTemplate(clinicId, t.template_name),
      })),
    );

    return enriched;
  }

  @Post('whatsapp/base/:id/clone')
  @RequireFeature('CUSTOM_TEMPLATES')
  @ApiOperation({
    summary: 'Clone a base WhatsApp template into your clinic',
    description: 'Creates a clinic-owned copy of a base template. After cloning, submit it to Meta for approval via POST /communication/whatsapp/templates/submit. Requires the CUSTOM_TEMPLATES feature (Enterprise plan).',
  })
  @ApiCreatedResponse({ description: 'Template cloned (or already exists)' })
  @ApiForbiddenResponse({ description: 'Plan does not include CUSTOM_TEMPLATES — upgrade to Enterprise to create your own templates' })
  async cloneBaseTemplate(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.cloneBaseTemplateForClinic(clinicId, id);
  }

  @Post()
  @RequireFeature('CUSTOM_TEMPLATES')
  @ApiOperation({ summary: 'Create a message template (Enterprise plan only)' })
  @ApiCreatedResponse({ description: 'Template created' })
  @ApiForbiddenResponse({ description: 'Plan does not include CUSTOM_TEMPLATES — upgrade to Enterprise to create your own templates' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templateService.create(clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List message templates (clinic + system)' })
  @ApiOkResponse({ description: 'Paginated list of templates' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryTemplateDto,
  ) {
    return this.templateService.findAll(clinicId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a message template by ID' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.findOne(clinicId, id);
  }

  @Patch(':id')
  @RequireFeature('CUSTOM_TEMPLATES')
  @ApiOperation({
    summary: 'Update a clinic-owned template (Enterprise plan only)',
    description: 'Only modifies templates the clinic created. System-approved templates remain immutable for everyone.',
  })
  @ApiForbiddenResponse({ description: 'Plan does not include CUSTOM_TEMPLATES — upgrade to Enterprise to edit your own templates' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(clinicId, id, dto);
  }

  @Delete(':id')
  @RequireFeature('CUSTOM_TEMPLATES')
  @ApiOperation({
    summary: 'Delete a clinic-owned template (Enterprise plan only)',
    description: 'Only deletes templates the clinic created. System-approved templates remain immutable for everyone.',
  })
  @ApiForbiddenResponse({ description: 'Plan does not include CUSTOM_TEMPLATES — upgrade to Enterprise to delete your own templates' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.remove(clinicId, id);
  }
}
