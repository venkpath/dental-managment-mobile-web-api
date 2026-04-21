import { IsString, IsUUID, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClinicalVisitDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' })
  @IsUUID()
  dentist_id!: string;

  @ApiPropertyOptional({ description: 'Linked scheduled appointment UUID (null for walk-in)' })
  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @ApiPropertyOptional({ example: 'Pain in lower-right molar while chewing for 3 days' })
  @IsOptional()
  @IsString()
  chief_complaint?: string;

  @ApiPropertyOptional({ description: 'History of present illness' })
  @IsOptional()
  @IsString()
  history_of_present_illness?: string;

  @ApiPropertyOptional({ description: 'Past dental history — previous extractions, RCTs, orthodontic work, etc.' })
  @IsOptional()
  @IsString()
  past_dental_history?: string;

  @ApiPropertyOptional({ description: "Clinician's notes reviewing patient's medical history at this visit" })
  @IsOptional()
  @IsString()
  medical_history_notes?: string;

  @ApiPropertyOptional({ description: 'Clinical examination findings' })
  @IsOptional()
  @IsString()
  examination_notes?: string;

  @ApiPropertyOptional({ description: 'Recommended review/follow-up date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  review_after_date?: string;

  @ApiPropertyOptional({ description: 'Vital signs JSON (bp, pulse, temp, etc.)' })
  @IsOptional()
  @IsObject()
  vital_signs?: Record<string, unknown>;
}
