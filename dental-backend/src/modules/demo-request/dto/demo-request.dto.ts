import { IsString, IsEmail, IsOptional, MaxLength, Matches, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDemoRequestDto {
  @ApiProperty({ example: 'Dr. Priya Sharma' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'priya@clinic.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^(\+91|91)?[0-9]{10}$/, { message: 'phone must be a valid Indian phone number (e.g., +919876543210, 919876543210, or 9876543210)' })
  phone!: string;

  @ApiPropertyOptional({ example: 'Smile Dental Clinic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  clinicName?: string;

  @ApiPropertyOptional({ example: '2-3', enum: ['1', '2-3', '4-6', '7+'] })
  @IsOptional()
  @IsString()
  @IsIn(['1', '2-3', '4-6', '7+'])
  chairs?: string;

  @ApiPropertyOptional({ example: 'website', enum: ['website', 'landing_page', 'referral'] })
  @IsOptional()
  @IsString()
  @IsIn(['website', 'landing_page', 'referral'])
  source?: string;
}

/** Submitted from inside the app by a directory-only clinic user on first login.
 *  Name / email / phone / clinic are auto-populated from the auth context on the server. */
export class CreateDemoRequestFromAppDto {
  @ApiProperty({ example: '2026-06-15', description: 'YYYY-MM-DD preferred date' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'preferred_date must be YYYY-MM-DD' })
  preferredDate!: string;

  @ApiProperty({ example: '10:00', description: 'HH:mm preferred time slot' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[03]0$/, { message: 'preferred_slot must be a valid HH:00 or HH:30 slot' })
  preferredSlot!: string;
}

export class UpdateDemoStatusDto {
  @ApiProperty({ example: 'scheduled', enum: ['pending', 'contacted', 'scheduled', 'completed', 'cancelled'] })
  @IsString()
  @IsIn(['pending', 'contacted', 'scheduled', 'completed', 'cancelled'])
  status!: string;

  @ApiPropertyOptional({ example: 'Will follow up next week' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ example: '2026-04-20T14:00:00.000Z' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingLink?: string;
}
