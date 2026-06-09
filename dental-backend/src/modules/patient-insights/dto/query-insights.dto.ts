import { IsOptional, IsUUID, IsIn, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
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

export class RecordActionDto {
  @ApiPropertyOptional({ enum: ['recall', 'churn'] })
  @IsNotEmpty()
  @IsIn(['recall', 'churn'])
  type!: 'recall' | 'churn';

  @ApiPropertyOptional({ enum: ['contacted', 'snooze', 'move_inactive', 'decline'] })
  @IsNotEmpty()
  @IsIn(['contacted', 'snooze', 'move_inactive', 'decline'])
  action!: 'contacted' | 'snooze' | 'move_inactive' | 'decline';

  @ApiPropertyOptional({ description: 'Days to snooze (1–30). Required when action=snooze.', default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  snooze_days?: number;
}
