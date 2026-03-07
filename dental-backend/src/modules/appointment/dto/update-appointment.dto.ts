import { IsOptional, IsEnum } from 'class-validator';
import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAppointmentDto, AppointmentStatus } from './create-appointment.dto.js';

export class UpdateAppointmentDto extends PartialType(
  OmitType(CreateAppointmentDto, ['branch_id', 'patient_id'] as const),
) {
  @ApiPropertyOptional({ example: 'completed', enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
