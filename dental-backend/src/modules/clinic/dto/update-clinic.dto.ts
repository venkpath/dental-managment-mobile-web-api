import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateClinicDto } from './create-clinic.dto.js';

export class UpdateClinicDto extends PartialType(CreateClinicDto) {
  @ApiPropertyOptional({ description: 'Enable the Room Board feature for this clinic' })
  @IsOptional()
  @IsBoolean()
  rooms_enabled?: boolean;
}
