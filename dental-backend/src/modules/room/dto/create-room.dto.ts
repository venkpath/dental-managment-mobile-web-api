import { IsString, IsOptional, IsInt, IsBoolean, Min, MaxLength, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ example: 'uuid-of-branch' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ example: 'Room 1' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'operatory', enum: ['operatory', 'consultation', 'xray', 'surgery'] })
  @IsOptional()
  @IsString()
  @IsIn(['operatory', 'consultation', 'xray', 'surgery'])
  room_type?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ example: 'Has digital X-ray sensor' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
