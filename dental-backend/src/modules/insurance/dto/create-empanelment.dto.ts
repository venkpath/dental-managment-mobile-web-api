import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const STATUSES = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING'] as const;
export type EmpanelmentStatus = (typeof STATUSES)[number];

export class CreateEmpanelmentDto {
  @ApiProperty({ description: 'Insurance provider UUID (CGHS, ECHS, Star Health, ...)' })
  @IsUUID()
  provider_id!: string;

  @ApiProperty({ example: 'CGHS/CHN/DENTAL/2024/0012' })
  @IsString()
  @MaxLength(100)
  empanelment_number!: string;

  @ApiPropertyOptional({ example: '2024-04-01', description: 'ISO date' })
  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @ApiPropertyOptional({ example: '2027-03-31', description: 'ISO date' })
  @IsOptional()
  @IsDateString()
  valid_to?: string;

  @ApiPropertyOptional({ example: 'Smart Dental Desk LLP' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bank_account_name?: string;

  @ApiPropertyOptional({ example: '50100123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bank_account_number?: string;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bank_ifsc?: string;

  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bank_name?: string;

  @ApiPropertyOptional({ example: 'Mr. Ramesh Iyer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact_person_name?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact_person_phone?: string;

  @ApiPropertyOptional({ example: 'cghs.chennai@nic.in' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contact_person_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(STATUSES as unknown as string[])
  status?: EmpanelmentStatus;
}
