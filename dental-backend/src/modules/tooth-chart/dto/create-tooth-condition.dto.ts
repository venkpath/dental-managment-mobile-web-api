import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateToothConditionDto {
  @ApiProperty({ description: 'Branch ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  branch_id!: string;

  @ApiProperty({ description: 'Patient ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @ApiProperty({ description: 'Tooth ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  tooth_id!: string;

  @ApiPropertyOptional({ description: 'Tooth surface ID (optional)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  surface_id?: string;

  @ApiProperty({ description: 'Condition name (e.g. cavity, fracture, missing)', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  condition!: string;

  @ApiPropertyOptional({ description: 'Severity (mild, moderate, severe)', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  severity?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Dentist/User ID who diagnosed', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  diagnosed_by!: string;
}
