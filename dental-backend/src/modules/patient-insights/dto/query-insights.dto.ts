import { IsOptional, IsUUID, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryInsightsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @ApiPropertyOptional({ enum: ['no_show', 'recall', 'churn', 'conversion'] })
  @IsOptional()
  @IsIn(['no_show', 'recall', 'churn', 'conversion'])
  type?: 'no_show' | 'recall' | 'churn' | 'conversion';

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class ComputeInsightsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branch_id?: string;
}
