import { IsString, IsOptional, IsInt, Min, Max, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateReviewReplyDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Dr. Patel was so gentle with my kid' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  review_text?: string;

  @ApiPropertyOptional({ example: 'Priya R.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reviewer_name?: string;

  @ApiPropertyOptional({ enum: ['warm', 'formal', 'brief'], default: 'warm' })
  @IsOptional()
  @IsIn(['warm', 'formal', 'brief'])
  tone?: 'warm' | 'formal' | 'brief';

  @ApiPropertyOptional({ description: 'Free-text steering for the LLM, e.g. always mention free re-consultation policy' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  custom_instructions?: string;

  @ApiPropertyOptional({ example: '— Team Smile Dental' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  signature?: string;
}
