import { IsString, IsUUID, IsOptional, IsArray, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePrescriptionDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({
    example: 'Irreversible pulpitis on tooth 36, RCT performed',
    description: 'Diagnosis and/or procedures performed',
  })
  @IsString()
  @MinLength(5)
  diagnosis!: string;

  @ApiPropertyOptional({ example: 'Root Canal Treatment, Composite filling' })
  @IsOptional()
  @IsString()
  procedures_performed?: string;

  @ApiPropertyOptional({ example: ['36', '47'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tooth_numbers?: string[];

  @ApiPropertyOptional({ example: 'Currently taking Metformin for diabetes' })
  @IsOptional()
  @IsString()
  existing_medications?: string;
}
