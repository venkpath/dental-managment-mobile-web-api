import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeatureOverrideItem {
  @ApiProperty({ description: 'Feature UUID' })
  @IsUUID()
  feature_id!: string;

  @ApiPropertyOptional({
    description:
      'true = grant on top of plan, false = revoke from plan, null/omitted = remove override (use plan default)',
    nullable: true,
    type: Boolean,
  })
  @IsOptional()
  // Accept true, false, or null. Without this list, `@IsBoolean()` would
  // reject `null` and the service code (which checks === null to delete) would
  // never see the value. `@IsOptional()` allows `undefined`; the service
  // treats undefined and null the same.
  @IsIn([true, false, null])
  is_enabled?: boolean | null;

  @ApiPropertyOptional({
    description: 'Free-text justification recorded on the override row for support traceability',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'ISO timestamp at which the override auto-reverts (omit for permanent)',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}

export class UpdateClinicFeaturesDto {
  @ApiProperty({ type: [FeatureOverrideItem] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FeatureOverrideItem)
  overrides!: FeatureOverrideItem[];
}
