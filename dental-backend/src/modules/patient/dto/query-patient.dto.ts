import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryPatientDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Search by patient name (first or last)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by branch UUID' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;
}
