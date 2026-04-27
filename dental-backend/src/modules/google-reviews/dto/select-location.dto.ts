import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectLocationDto {
  @ApiProperty({ description: 'Google location id (numeric, no "locations/" prefix)', example: '987654321' })
  @IsString()
  @MaxLength(100)
  location_id!: string;

  @ApiProperty({ description: 'Human-readable location title', example: 'Smart Dental Desk — Anna Nagar' })
  @IsString()
  @MaxLength(255)
  location_name!: string;
}
