import { PartialType } from '@nestjs/swagger';
import { CreateClinicalVisitDto } from './create-clinical-visit.dto.js';
import { IsOptional, IsObject, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClinicalVisitDto extends PartialType(CreateClinicalVisitDto) {
  @ApiPropertyOptional({ description: 'Diagnosis summary entered during/after examination' })
  @IsOptional()
  @IsString()
  diagnosis_summary?: string;

  @ApiPropertyOptional({ description: 'SOAP notes JSON (AI-generated or manual)' })
  @IsOptional()
  @IsObject()
  soap_notes?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Recommended review/follow-up date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  review_after_date?: string;
}
