import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TreatmentStatus } from './create-treatment.dto.js';

export class QueryTreatmentDto {
  @ApiPropertyOptional({ description: 'Filter by dentist UUID' })
  @IsOptional()
  @IsUUID()
  dentist_id?: string;

  @ApiPropertyOptional({ description: 'Filter by branch UUID' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: TreatmentStatus })
  @IsOptional()
  @IsEnum(TreatmentStatus)
  status?: TreatmentStatus;
}
