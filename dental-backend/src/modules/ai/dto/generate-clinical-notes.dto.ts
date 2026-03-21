import { IsString, IsUUID, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateClinicalNotesDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({
    example: 'Patient complains of pain in lower right molar. Cavity detected on 36, advised RCT.',
    description: 'Brief dentist notes from the visit',
  })
  @IsString()
  @MinLength(10)
  dentist_notes!: string;

  @ApiPropertyOptional({ example: 'Severe toothache in lower right' })
  @IsOptional()
  @IsString()
  chief_complaint?: string;
}
