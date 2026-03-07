import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryAuditLogDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by entity type (e.g. patients, appointments)' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ description: 'Filter by entity ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiPropertyOptional({ description: 'Filter by action (create, update, delete)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  user_id?: string;
}
