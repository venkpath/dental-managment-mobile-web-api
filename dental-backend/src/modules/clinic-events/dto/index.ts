import { IsOptional, IsString, IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClinicEventDto {
  @ApiProperty()
  @IsString()
  event_name!: string;

  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  @IsDateString()
  event_date!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  template_id?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  send_offer?: boolean;

  @ApiPropertyOptional({ description: 'e.g. { percentage: 20, treatment: "cleaning", valid_until: "2025-01-31" }' })
  @IsOptional()
  offer_details?: Record<string, unknown>;
}

export class UpdateClinicEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  event_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  event_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  template_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  send_offer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  offer_details?: Record<string, unknown>;
}
