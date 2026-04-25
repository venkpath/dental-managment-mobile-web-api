import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @ApiProperty({ example: 'Amoxicillin 500mg', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  medicine_name!: string;

  @ApiProperty({ example: '500mg', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  dosage!: string;

  @ApiProperty({ example: 'Three times a day after meals', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  frequency!: string;

  @ApiProperty({ example: '5 days', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  duration!: string;

  @ApiPropertyOptional({ example: 1, description: 'Morning dose count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  morning?: number;

  @ApiPropertyOptional({ example: 0, description: 'Afternoon dose count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  afternoon?: number;

  @ApiPropertyOptional({ example: 1, description: 'Evening dose count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  evening?: number;

  @ApiPropertyOptional({ example: 0, description: 'Night dose count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  night?: number;

  @ApiPropertyOptional({ example: 'Take with warm water' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' })
  @IsUUID()
  dentist_id!: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440003', description: 'Clinical Visit UUID (optional link to consultation)' })
  @IsOptional()
  @IsUUID()
  clinical_visit_id?: string;

  @ApiProperty({ example: 'Post-extraction infection', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  diagnosis!: string;

  @ApiPropertyOptional({ example: 'Pain in lower-right molar for 3 days' })
  @IsOptional()
  @IsString()
  chief_complaint?: string;

  @ApiPropertyOptional({ example: 'RCT done on tooth 36 in 2024' })
  @IsOptional()
  @IsString()
  past_dental_history?: string;

  @ApiPropertyOptional({ example: 'Allergic to penicillin. Hypertension on medication.' })
  @IsOptional()
  @IsString()
  allergies_medical_history?: string;

  @ApiPropertyOptional({ example: 'Avoid hot food for 24 hours. Follow up in 1 week.' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ type: [PrescriptionItemDto], description: 'List of prescribed medicines' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items!: PrescriptionItemDto[];
}
