import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { TemplateChannel, TemplateCategory } from './create-template.dto.js';

export class QueryTemplateDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TemplateChannel })
  @IsOptional()
  @IsEnum(TemplateChannel)
  channel?: TemplateChannel;

  @ApiPropertyOptional({ enum: TemplateCategory })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
