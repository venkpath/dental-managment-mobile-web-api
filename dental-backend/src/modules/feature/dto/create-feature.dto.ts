import { IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({ example: 'AI_PRESCRIPTION', description: 'Unique feature key (UPPER_SNAKE_CASE)', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: 'key must be UPPER_SNAKE_CASE' })
  key!: string;

  @ApiProperty({ example: 'AI-powered prescription generation', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  description!: string;
}
