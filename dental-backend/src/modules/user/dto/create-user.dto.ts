import { IsString, IsEmail, IsUUID, IsOptional, IsEnum, IsBoolean, IsArray, IsInt, IsNumber, MaxLength, MinLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'Admin',
  DENTIST = 'Dentist',
  RECEPTIONIST = 'Receptionist',
  STAFF = 'Staff',
  CONSULTANT = 'Consultant',
}

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiProperty({ example: 'Dr. Jane Smith', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'jane@brightsmile.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: 'StrongP@ss1', description: 'Defaults to Admin@123 if not provided', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: '+919876543210', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DENTIST })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ description: 'Mark as doctor regardless of role — appears in doctor dropdowns and receives dentist reminders', example: false })
  @IsOptional()
  @IsBoolean()
  is_doctor?: boolean;

  @ApiPropertyOptional({ description: 'Show this doctor on the public patient-facing directory', example: true })
  @IsOptional()
  @IsBoolean()
  listed_in_directory?: boolean;

  @ApiPropertyOptional({ example: 'KDC-12345', description: 'Doctor registration / license number printed on prescription PDFs', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  license_number?: string;

  @ApiPropertyOptional({ example: 'clinics/abc/doctor-signatures/xyz.png', description: 'S3 key of the uploaded signature image. Set via POST /users/:id/signature.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signature_url?: string;

  @ApiPropertyOptional({ example: 'Specialist in orthodontics with 10+ years of experience.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  years_experience?: number;

  @ApiPropertyOptional({ example: ['Orthodontics', 'Implants'], description: 'JSON array of specializations' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({ example: 'English, Tamil, Hindi', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  languages_spoken?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultation_fee?: number;
}
