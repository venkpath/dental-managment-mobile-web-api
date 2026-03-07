import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from './create-invoice.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryInvoiceDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by patient UUID' })
  @IsOptional()
  @IsUUID()
  patient_id?: string;

  @ApiPropertyOptional({ description: 'Filter by branch UUID' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
