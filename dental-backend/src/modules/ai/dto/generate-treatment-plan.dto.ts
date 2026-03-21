import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateTreatmentPlanDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiPropertyOptional({ example: 'Pain in lower right molar and bleeding gums' })
  @IsOptional()
  @IsString()
  chief_complaint?: string;
}
