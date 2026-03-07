import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
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

  @ApiProperty({ example: 'Post-extraction infection', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  diagnosis!: string;

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
