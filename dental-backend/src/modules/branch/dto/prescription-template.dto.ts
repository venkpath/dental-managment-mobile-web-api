import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsBoolean, IsOptional } from 'class-validator';
import type {
  PrescriptionTemplateConfig,
  PrescriptionTemplateZone,
} from '../../prescription/prescription-pdf.service.js';

// Single source of truth for the template config shape lives in the PDF
// service (the consumer that actually renders it). Re-export here so the
// branch DTOs and frontend type imports continue to work unchanged.
export type { PrescriptionTemplateConfig, PrescriptionTemplateZone };

export class SaveTemplateConfigDto {
  @ApiProperty({ description: 'Zone definitions + image metadata. See PrescriptionTemplateConfig.' })
  @IsObject()
  config!: PrescriptionTemplateConfig;

  @ApiPropertyOptional({ description: 'Whether to use this template (vs default layout). Defaults to true on save.' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class PreviewTemplateDto {
  @ApiProperty({ description: 'Zone config to preview (does not need to be saved).' })
  @IsObject()
  config!: PrescriptionTemplateConfig;

  @ApiPropertyOptional({ description: 'Render with the notepad image as background (default true).' })
  @IsOptional()
  @IsBoolean()
  with_background?: boolean;
}
