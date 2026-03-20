import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsObject,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

export class CreatePatientDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Branch UUID' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ example: 'John', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  first_name!: string;

  @ApiProperty({ example: 'Doe', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  last_name!: string;

  @ApiProperty({ example: '+91-9876543210', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  phone!: string;

  @ApiPropertyOptional({ example: 'john.doe@email.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: 'Male', enum: Gender })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: 30, description: 'Patient age (used when DOB is not known)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @ApiPropertyOptional({ example: 'O+', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  blood_group?: string;

  @ApiPropertyOptional({
    example: { diabetes: false, hypertension: true },
    description: 'Structured medical history as JSON',
  })
  @IsOptional()
  @IsObject()
  medical_history?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Penicillin, Latex', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  allergies?: string;

  @ApiPropertyOptional({ example: 'Patient prefers morning appointments' })
  @IsOptional()
  @IsString()
  notes?: string;
}
