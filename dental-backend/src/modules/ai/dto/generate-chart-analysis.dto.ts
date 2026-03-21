import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateChartAnalysisDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;
}
