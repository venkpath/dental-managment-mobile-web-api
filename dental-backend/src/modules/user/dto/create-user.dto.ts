import { IsString, IsEmail, IsUUID, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'Admin',
  DENTIST = 'Dentist',
  RECEPTIONIST = 'Receptionist',
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
}
