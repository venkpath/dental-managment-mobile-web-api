import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto.js';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

export class UpdateRoomStatusDto {
  @ApiPropertyOptional({
    example: 'occupied',
    enum: ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'],
  })
  @IsString()
  @IsIn(['available', 'occupied', 'cleaning', 'maintenance', 'reserved'])
  status!: string;
}

export class AssignRoomDto {
  @ApiPropertyOptional({ example: 'uuid-of-appointment' })
  @IsOptional()
  @IsString()
  appointment_id?: string | null;
}
