import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryExpenseDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by branch ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment mode',
    enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['cash', 'bank_transfer', 'upi', 'card', 'cheque'])
  payment_mode?: string;

  @ApiPropertyOptional({ description: 'Search by title or vendor' })
  @IsOptional()
  @IsString()
  search?: string;
}
