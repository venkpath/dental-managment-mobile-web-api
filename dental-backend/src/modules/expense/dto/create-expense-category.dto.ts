import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExpenseCategoryDto {
  @ApiProperty({ description: 'Category name', maxLength: 100, example: 'Office Furniture' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Icon identifier', maxLength: 50, example: 'chair' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}
