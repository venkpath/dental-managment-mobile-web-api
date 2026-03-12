import { IsOptional, IsString, IsArray, ValidateNested, ArrayMinSize, MaxLength, IsUUID } from 'class-validator';
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

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' })
  @IsOptional()
  @IsUUID()
  dentist_id?: string;

  @ApiPropertyOptional({ type: [PrescriptionItemDto], description: 'Replaces all existing medicine items' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items?: PrescriptionItemDto[];
}
