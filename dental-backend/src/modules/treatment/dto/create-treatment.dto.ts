import { IsString, IsUUID, IsOptional, IsNumber, IsEnum, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum TreatmentStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export class CreateTreatmentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' })
  @IsUUID()
  dentist_id!: string;

  @ApiPropertyOptional({
    example: '14',
    maxLength: 10,
    description: 'FDI tooth number (e.g. 11-48 for permanent, 51-85 for primary)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => value != null ? String(value) : value)
  tooth_number?: string;

  @ApiProperty({ example: 'Dental caries – mesial surface', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  diagnosis!: string;

  @ApiProperty({ example: 'Composite restoration (Class II)', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  procedure!: string;

  @ApiProperty({ example: 2500.0, description: 'Treatment cost' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  cost!: number;

  @ApiPropertyOptional({ example: 'planned', enum: TreatmentStatus, default: TreatmentStatus.PLANNED })
  @IsOptional()
  @IsEnum(TreatmentStatus)
  status?: TreatmentStatus;

  @ApiPropertyOptional({ example: 'Patient reported sensitivity to cold' })
  @IsOptional()
  @IsString()
  notes?: string;
}
