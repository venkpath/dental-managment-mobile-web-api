import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MembershipEnrollmentMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patient_id!: string;

  @ApiPropertyOptional({ example: 'Spouse' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relation_label?: string;
}

export class CreateMembershipEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  membership_plan_id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  primary_patient_id!: string;

  @ApiProperty({ example: '2026-04-16' })
  @IsDateString()
  start_date!: string;

  @ApiPropertyOptional({ example: '2027-04-16' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ example: 400, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount_paid?: number;

  @ApiPropertyOptional({ example: 'Front desk issued printed card.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [MembershipEnrollmentMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembershipEnrollmentMemberDto)
  members?: MembershipEnrollmentMemberDto[];
}