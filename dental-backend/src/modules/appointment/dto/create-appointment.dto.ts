import { IsString, IsUUID, IsDateString, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export class CreateAppointmentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' })
  @IsUUID()
  dentist_id!: string;

  @ApiProperty({ example: '2026-03-15', description: 'Appointment date (YYYY-MM-DD)' })
  @IsDateString()
  appointment_date!: string;

  @ApiProperty({ example: '09:00', description: 'Start time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'start_time must be in HH:mm format (e.g. 09:00)' })
  start_time!: string;

  @ApiProperty({ example: '09:30', description: 'End time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'end_time must be in HH:mm format (e.g. 09:30)' })
  end_time!: string;

  @ApiPropertyOptional({ example: 'Root canal treatment – upper left molar' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'When false, this appointment cannot be rescheduled (date/time changes are blocked)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allow_reschedule?: boolean;
}
