import { IsArray, IsBoolean, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanFeatureItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  feature_id!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean;
}

export class AssignFeaturesDto {
  @ApiProperty({ type: [PlanFeatureItemDto], description: 'Features to assign to the plan' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureItemDto)
  features!: PlanFeatureItemDto[];
}
