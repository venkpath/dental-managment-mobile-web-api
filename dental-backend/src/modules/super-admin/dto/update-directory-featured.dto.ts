import { IsArray, IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDirectoryFeaturedDto {
  @ApiProperty({ description: 'Show this clinic in the homepage Featured Dental Clinics carousel' })
  @IsBoolean()
  featured!: boolean;

  @ApiPropertyOptional({ description: 'Display order (1 = first). Auto-assigned when enabling if omitted.', minimum: 1, maximum: 999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  order?: number;
}

export class ReorderFeaturedClinicsDto {
  @ApiProperty({ type: [String], description: 'Featured clinic IDs in desired display order (first = position 1)' })
  @IsArray()
  @IsUUID('4', { each: true })
  clinic_ids!: string[];
}
