import { IsString, IsIn, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadTreatmentMediaDto {
  @ApiProperty({ enum: ['photo', 'xray', 'report', 'document'] })
  @IsString()
  @IsIn(['photo', 'xray', 'report', 'document'])
  media_type!: string;

  @ApiProperty({ description: 'Branch UUID' })
  @IsString()
  branch_id!: string;

  @ApiProperty({ description: 'Visit date (YYYY-MM-DD)' })
  @IsDateString()
  visit_date!: string;

  @ApiPropertyOptional({ description: 'Optional caption' })
  @IsOptional()
  @IsString()
  caption?: string;
}
