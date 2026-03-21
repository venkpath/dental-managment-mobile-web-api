import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateRevenueInsightsDto {
  @ApiProperty({ example: '2026-03-01' })
  @IsString()
  start_date!: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsString()
  end_date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch_id?: string;
}
