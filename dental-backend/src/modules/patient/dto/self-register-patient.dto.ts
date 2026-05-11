import {
  IsString, IsEmail, IsOptional, IsEnum, IsDateString, IsInt, Min, Max, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from './create-patient.dto.js';

export class SelfRegisterPatientDto {
  @ApiProperty({ example: 'Ravi', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  first_name!: string;

  @ApiProperty({ example: 'Kumar', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  last_name!: string;

  @ApiProperty({ example: '9876543210', maxLength: 50, description: 'Patient mobile number' })
  @IsString()
  @MaxLength(50)
  phone!: string;

  @ApiPropertyOptional({ example: 'ravi@email.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Male', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;
}
