import { IsEmail, IsString, IsOptional, IsBoolean, MaxLength, MinLength, IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterClinicDto {
  @ApiProperty({ example: 'Bright Smile Dental', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  clinic_name!: string;

  @ApiProperty({ example: 'clinic@brightsmile.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  clinic_email!: string;

  @ApiPropertyOptional({ example: '9876543210', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  clinic_phone?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Koramangala', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Bangalore', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ example: 'Dr. Priya Sharma', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  admin_name!: string;

  @ApiProperty({ example: 'priya@brightsmile.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  admin_email!: string;

  @ApiProperty({ example: '+919876543210', description: 'Admin mobile in E.164 format (used for WhatsApp)' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Enter a valid phone number with country code (e.g. +919876543210)' })
  admin_phone!: string;

  @ApiProperty({ example: 'StrongP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  admin_password!: string;

  @ApiPropertyOptional({ description: 'Set to true if the registering admin is also a practicing dentist — they will appear in doctor dropdowns', example: false })
  @IsOptional()
  @IsBoolean()
  is_doctor?: boolean;

  @ApiPropertyOptional({ example: 'KDC-123456', description: 'Dental council registration / license number (only relevant when is_doctor is true)', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  license_number?: string;

  @ApiPropertyOptional({ example: 'starter', description: 'Plan key: free, starter, professional, enterprise. Defaults to trial.' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  plan_key?: string;

  @ApiPropertyOptional({ example: 'monthly', description: 'Billing cycle: monthly or yearly. Defaults to monthly.', enum: ['monthly', 'yearly'] })
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billing_cycle?: 'monthly' | 'yearly';
}
