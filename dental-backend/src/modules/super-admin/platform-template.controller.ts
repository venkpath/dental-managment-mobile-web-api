import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { PlatformTemplateService } from './platform-template.service.js';

class UpdatePlatformTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

class PreviewPlatformTemplateDto {
  @IsString()
  @MaxLength(4096)
  body!: string;

  @IsOptional()
  @IsObject()
  sampleValues?: Record<string, string>;
}

/**
 * Super-admin-only management of platform-level WhatsApp templates.
 * Mounted under /super-admins/platform-templates.
 */
@ApiTags('Super Admin · Platform Templates')
@Controller('super-admins/platform-templates')
export class PlatformTemplateController {
  constructor(private readonly service: PlatformTemplateService) {}

  @Get()
  @SuperAdmin()
  @ApiOperation({ summary: 'List all platform templates (clinic_id=null + platform names)' })
  @ApiOkResponse({ description: 'Platform templates' })
  async list() {
    return this.service.list();
  }

  @Get(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get a single platform template' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update body / subject / language / active flag of a platform template' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post('preview')
  @SuperAdmin()
  @ApiOperation({ summary: 'Render a template body with sample values (preview only, no DB write)' })
  preview(@Body() dto: PreviewPlatformTemplateDto) {
    return this.service.preview(dto.body, dto.sampleValues ?? {});
  }
}
