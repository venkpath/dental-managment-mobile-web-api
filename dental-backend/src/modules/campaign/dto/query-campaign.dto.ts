import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryCampaignDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled'] })
  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ enum: ['email', 'sms', 'whatsapp', 'all'] })
  @IsOptional()
  @IsEnum(['email', 'sms', 'whatsapp', 'all'])
  channel?: string;
}
