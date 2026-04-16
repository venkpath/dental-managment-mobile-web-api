import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMembershipUsageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  membership_benefit_id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patient_id!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  treatment_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  invoice_id?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  quantity_used?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount_applied?: number;

  @ApiPropertyOptional({ example: 'Applied during recall visit.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '2026-04-16T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  used_on?: string;
}