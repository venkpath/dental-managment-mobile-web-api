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

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'phone must be a valid 10-digit Indian number' })
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
