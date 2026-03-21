import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateAppointmentSummaryDto {
  @ApiProperty({ description: 'Appointment UUID' })
  @IsUUID()
  appointment_id!: string;

  @ApiPropertyOptional({ example: 'Severe toothache' })
  @IsOptional()
  @IsString()
  chief_complaint?: string;
}
