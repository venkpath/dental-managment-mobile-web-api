import { IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateTreatmentPlanDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({ example: 'Pain in lower right molar and bleeding gums' })
  @IsString()
  @MinLength(3)
  chief_complaint!: string;

  @ApiProperty({
    example: 'Tooth 36 deep distal caries, percussion +ve. Generalized gingivitis. Missing 26.',
    description: 'Dentist examination notes — required so the AI can plan when the dental chart is sparse.',
  })
  @IsString()
  @MinLength(10)
  dentist_notes!: string;
}
