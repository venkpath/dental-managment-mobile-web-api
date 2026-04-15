import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export enum ClinicalVisitStatus {
  IN_PROGRESS = 'in_progress',
  FINALIZED = 'finalized',
  CANCELLED = 'cancelled',
}

export class QueryClinicalVisitDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by patient UUID' })
  @IsOptional()
  @IsUUID()
  patient_id?: string;

  @ApiPropertyOptional({ description: 'Filter by dentist UUID' })
  @IsOptional()
  @IsUUID()
  dentist_id?: string;

  @ApiPropertyOptional({ description: 'Filter by branch UUID' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ description: 'Filter by appointment UUID' })
  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ClinicalVisitStatus })
  @IsOptional()
  @IsEnum(ClinicalVisitStatus)
  status?: ClinicalVisitStatus;
}
