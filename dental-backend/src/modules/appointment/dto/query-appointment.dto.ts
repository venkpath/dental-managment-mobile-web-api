import { IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryAppointmentDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by date (YYYY-MM-DD)', example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by dentist UUID' })
  @IsOptional()
  @IsUUID()
  dentist_id?: string;

  @ApiPropertyOptional({ description: 'Filter by branch UUID' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;
}
