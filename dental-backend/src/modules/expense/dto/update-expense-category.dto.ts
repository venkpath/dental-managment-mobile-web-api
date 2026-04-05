import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateExpenseCategoryDto } from './create-expense-category.dto.js';

export class UpdateExpenseCategoryDto extends PartialType(CreateExpenseCategoryDto) {
  @ApiPropertyOptional({ description: 'Whether the category is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
