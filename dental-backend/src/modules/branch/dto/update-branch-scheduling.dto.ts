import { IsOptional, IsString, IsInt, Min, Max, Matches, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBranchSchedulingDto {
  @ApiPropertyOptional({ example: '09:00', description: 'Branch opening time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'working_start_time must be HH:mm format' })
  working_start_time?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Branch closing time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'working_end_time must be HH:mm format' })
  working_end_time?: string;

  @ApiPropertyOptional({ example: '13:00', description: 'Lunch break start (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'lunch_start_time must be HH:mm format' })
  lunch_start_time?: string;

  @ApiPropertyOptional({ example: '14:00', description: 'Lunch break end (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'lunch_end_time must be HH:mm format' })
  lunch_end_time?: string;

  @ApiPropertyOptional({ example: 15, description: 'Slot duration in minutes (15, 20, 30, 45, 60)' })
  @IsOptional()
  @IsInt()
  @IsIn([15, 20, 30, 45, 60], { message: 'slot_duration must be one of: 15, 20, 30, 45, 60' })
  slot_duration?: number;

  @ApiPropertyOptional({ example: 30, description: 'Default appointment duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(240)
  default_appt_duration?: number;

  @ApiPropertyOptional({ example: 5, description: 'Buffer minutes between appointments' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  buffer_minutes?: number;

  @ApiPropertyOptional({ example: 30, description: 'How many days ahead appointments can be booked (0 = unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  advance_booking_days?: number;

  @ApiPropertyOptional({ example: '1,2,3,4,5,6', description: 'Working days (1=Mon..7=Sun), comma-separated' })
  @IsOptional()
  @IsString()
  @Matches(/^[1-7](,[1-7])*$/, { message: 'working_days must be comma-separated day numbers (1=Mon..7=Sun)' })
  working_days?: string;
}
