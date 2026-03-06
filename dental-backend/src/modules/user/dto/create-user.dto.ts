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

  @ApiProperty({ example: 'StrongP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DENTIST })
  @IsEnum(UserRole)
  role!: UserRole;
}
