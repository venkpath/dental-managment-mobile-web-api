import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatientAnalyticsQueryDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-03-01' })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-03-31' })
  @IsDateString()
  end_date!: string;

  @ApiPropertyOptional({ description: 'Filter by branch UUID' })
  @IsOptional()
  @IsUUID()
  branch_id?: string;
}
