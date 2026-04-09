import { IsString, IsOptional, MaxLength, IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'Downtown Branch', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: '+1-555-100-2000', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '456 Oak Avenue', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Los Angeles', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'CA', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '560001', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({ example: 12.9716, description: 'Branch latitude for Google Maps' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946, description: 'Branch longitude for Google Maps' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: 'https://maps.google.com/?q=12.9716,77.5946', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  map_url?: string;

  @ApiPropertyOptional({
    example: 'https://www.smartdentaldesk.com/booking/smile',
    description: 'Custom online booking URL for this branch. If not set, patients are directed to the SmartDentalDesk booking page.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  book_now_url?: string;
}
