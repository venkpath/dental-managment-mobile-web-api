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
import { ApiTags, ApiOperation, ApiHeader, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
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

  @Post()
  @ApiOperation({ summary: 'Create a message template' })
  @ApiCreatedResponse({ description: 'Template created' })
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
  @ApiOperation({ summary: 'Update a clinic-owned template' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(clinicId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a clinic-owned template' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.remove(clinicId, id);
  }
}
