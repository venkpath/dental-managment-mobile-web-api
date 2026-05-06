import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardClinicDto {
  @ApiProperty({ example: 'Smile Dental Care' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  clinic_name!: string;

  @ApiProperty({ example: 'clinic@example.com' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  clinic_email!: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  clinic_phone?: string;

  @ApiPropertyOptional({ example: 'MG Road, Koramangala' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ example: 'Dr. John Doe' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  admin_name!: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  admin_email!: string;

  @ApiProperty({ example: '+919876543210', description: 'Admin mobile in E.164 format (used for WhatsApp)' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Enter a valid phone number with country code (e.g. +919876543210)' })
  admin_phone!: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  admin_password!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  plan_id?: string;

  @ApiPropertyOptional({ example: 'monthly', enum: ['monthly', 'yearly'], description: 'Billing cycle. Defaults to monthly.' })
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billing_cycle?: 'monthly' | 'yearly';

  @ApiPropertyOptional({ example: false, description: 'Enterprise flag — clinic brings their own WhatsApp Business Account (BYO-WABA). When true, platform does not bill WA usage.' })
  @IsOptional()
  @IsBoolean()
  has_own_waba?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Set to true if the admin is also a practicing dentist — they will appear in doctor dropdowns.' })
  @IsOptional()
  @IsBoolean()
  is_doctor?: boolean;
}
