import { IsString, IsNumber, IsInt, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Basic', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 49.99, description: 'Monthly price in USD' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price_monthly!: number;

  @ApiProperty({ example: 3, description: 'Maximum number of branches allowed' })
  @IsInt()
  @Min(1)
  max_branches!: number;

  @ApiProperty({ example: 10, description: 'Maximum number of staff members allowed' })
  @IsInt()
  @Min(1)
  max_staff!: number;

  @ApiPropertyOptional({ example: 100, description: 'AI usage quota (0 = no AI access)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ai_quota?: number;
}
