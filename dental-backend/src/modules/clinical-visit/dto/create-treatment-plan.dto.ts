import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PlanItemUrgency {
  IMMEDIATE = 'immediate',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export class TreatmentPlanItemDto {
  @ApiPropertyOptional({ example: '14,15', description: 'FDI tooth number(s), comma-separated for multiple' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tooth_number?: string;

  @ApiProperty({ example: 'Composite restoration (Class II)' })
  @IsString()
  @MaxLength(500)
  procedure!: string;

  @ApiPropertyOptional({ example: 'Dental caries – mesial surface' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnosis?: string;

  @ApiProperty({ example: 2500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  estimated_cost!: number;

  @ApiPropertyOptional({ enum: PlanItemUrgency, example: PlanItemUrgency.MEDIUM })
  @IsOptional()
  @IsEnum(PlanItemUrgency)
  urgency?: PlanItemUrgency;

  @ApiPropertyOptional({ example: 1, description: 'Phase number (1 = first phase)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  phase?: number;

  @ApiPropertyOptional({ example: 1, description: 'Sequence within phase' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTreatmentPlanDto {
  @ApiProperty({ description: 'Branch UUID' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({ description: 'Dentist UUID' })
  @IsUUID()
  dentist_id!: string;

  @ApiPropertyOptional({ description: 'Linked clinical visit UUID (plan created during this visit)' })
  @IsOptional()
  @IsUUID()
  clinical_visit_id?: string;

  @ApiProperty({ example: 'Quadrant-1 Restoration Plan', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [TreatmentPlanItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreatmentPlanItemDto)
  items!: TreatmentPlanItemDto[];
}
