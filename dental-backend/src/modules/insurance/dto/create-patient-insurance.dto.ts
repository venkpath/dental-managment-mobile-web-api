import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const RELATIONSHIPS = ['self', 'spouse', 'child', 'parent', 'dependent'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export class CreatePatientInsuranceDto {
  @ApiProperty({ description: 'Insurance plan UUID' })
  @IsUUID()
  plan_id!: string;

  @ApiPropertyOptional({ example: 1, description: '1 = primary, 2 = secondary (COB)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiProperty({ example: 'CGHS-CHN-12345678' })
  @IsString()
  @MaxLength(100)
  member_id!: string;

  @ApiPropertyOptional({ example: 'GRP-998877' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  group_number?: string;

  @ApiPropertyOptional({ example: 'TCS-EMP-998877' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  employee_id?: string;

  @ApiPropertyOptional({ example: 'BEN-CGHS-12345678' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  beneficiary_id?: string;

  @ApiPropertyOptional({ example: 'Tata Consultancy Services' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company_name?: string;

  @ApiPropertyOptional({ example: 'Ramesh Iyer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subscriber_name?: string;

  @ApiPropertyOptional({ enum: RELATIONSHIPS })
  @IsOptional()
  @IsIn(RELATIONSHIPS as unknown as string[])
  relationship?: Relationship;

  @ApiPropertyOptional({ example: '2024-04-01' })
  @IsOptional()
  @IsDateString()
  coverage_start?: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsDateString()
  coverage_end?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
