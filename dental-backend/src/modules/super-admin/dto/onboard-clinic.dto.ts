import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
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

  @ApiProperty({ example: 'SecurePass123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  admin_password!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  plan_id?: string;
}
