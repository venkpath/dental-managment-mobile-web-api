import { IsOptional, IsString, IsArray, ValidateNested, MaxLength, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PrescriptionItemDto } from './create-prescription.dto.js';

export class UpdatePrescriptionDto {
  @ApiPropertyOptional({ example: 'Updated diagnosis', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Updated instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chief_complaint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  past_dental_history?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies_medical_history?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' })
  @IsOptional()
  @IsUUID()
  dentist_id?: string;

  @ApiPropertyOptional({
    type: [PrescriptionItemDto],
    description: 'Replaces all existing medicine items. Pass an empty array to remove all medicines.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items?: PrescriptionItemDto[];
}
