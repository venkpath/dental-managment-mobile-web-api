import { IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryAvailableSlotsDto {
  @ApiProperty({ description: 'Branch UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ description: 'Dentist UUID', example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsUUID()
  dentist_id!: string;

  @ApiProperty({ description: 'Date to check (YYYY-MM-DD)', example: '2026-03-15' })
  @IsDateString()
  date!: string;
}
