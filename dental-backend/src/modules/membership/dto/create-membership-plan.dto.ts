import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMembershipBenefitDto {
  @ApiProperty({ example: 'Scaling & polishing' })
  @IsString()
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({ example: 'Annual preventive cleaning benefit' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'included_service', description: 'included_service | discount_percentage | discount_flat | credit' })
  @IsString()
  @MaxLength(30)
  benefit_type!: string;

  @ApiPropertyOptional({ example: 'Scaling and polishing' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  treatment_label?: string;

  @ApiPropertyOptional({ example: 'shared', description: 'shared | per_member', default: 'shared' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  coverage_scope?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  included_quantity?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount_percentage?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount_amount?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit_amount?: number;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateMembershipPlanDto {
  @ApiPropertyOptional({ example: 'FAMILY-ORAL-CARE' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ example: 'Family Oral Care Plan' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'Annual family preventive care package with procedure discounts.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'preventive' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 400, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration_months?: number;

  @ApiPropertyOptional({ example: 2, description: 'Maximum covered members including the primary patient', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  covered_members_limit?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  grace_period_days?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 'Valid for one year from enrollment date.' })
  @IsOptional()
  @IsString()
  terms_and_conditions?: string;

  @ApiProperty({ type: [CreateMembershipBenefitDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMembershipBenefitDto)
  benefits!: CreateMembershipBenefitDto[];
}