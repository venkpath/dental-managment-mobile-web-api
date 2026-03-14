import { IsString, IsUUID, IsDateString, IsOptional, Matches, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecurringAppointmentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Patient UUID' })
  @IsUUID()
  patient_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist (User) UUID' })
  @IsUUID()
  dentist_id!: string;

  @ApiProperty({ example: '2026-03-15', description: 'First appointment date (YYYY-MM-DD)' })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ example: '09:00', description: 'Start time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'start_time must be in HH:mm format' })
  start_time!: string;

  @ApiProperty({ example: '09:30', description: 'End time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'end_time must be in HH:mm format' })
  end_time!: string;

  @ApiProperty({ example: 'weekly', description: 'Recurrence interval', enum: ['weekly', 'biweekly', 'monthly'] })
  @IsString()
  @IsIn(['weekly', 'biweekly', 'monthly'])
  interval!: string;

  @ApiProperty({ example: 4, description: 'Number of occurrences (2–12)', minimum: 2, maximum: 12 })
  @IsInt()
  @Min(2)
  @Max(12)
  occurrences!: number;

  @ApiPropertyOptional({ example: 'Follow-up cleaning series' })
  @IsOptional()
  @IsString()
  notes?: string;
}
