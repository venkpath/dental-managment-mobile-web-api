import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsNumber, IsInt, IsJSON, Min, MaxLength, registerDecorator, ValidationOptions } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateClinicDto } from './create-clinic.dto.js';

function IsCurrentYearOrBefore(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCurrentYearOrBefore',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} must not exceed the current year`, ...options },
      validator: {
        validate(value: unknown) {
          if (value === null || value === undefined) return true;
          return typeof value === 'number' && value <= new Date().getFullYear();
        },
      },
    });
  };
}

export class UpdateClinicDto extends PartialType(CreateClinicDto) {
  @ApiPropertyOptional({ description: 'Enable the Room Board feature for this clinic' })
  @IsOptional()
  @IsBoolean()
  rooms_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Public clinic description shown in the directory', maxLength: 800 })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  clinic_description?: string;

  @ApiPropertyOptional({ description: 'Comma-separated specialties (e.g. "Orthodontics,Implantology")', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialties?: string;

  @ApiPropertyOptional({ description: 'Human-readable working hours label', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  working_hours_label?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate for geo search', example: 12.9716 })
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @ApiPropertyOptional({ description: 'Longitude coordinate for geo search', example: 77.5946 })
  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @ApiPropertyOptional({ description: 'Clinic public website URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website_url?: string;

  @ApiPropertyOptional({ description: 'Google Maps URL for the clinic location', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  google_maps_url?: string;

  @ApiPropertyOptional({ description: 'Year the clinic was established', example: 2014 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @IsCurrentYearOrBefore()
  established_year?: number | null;

  @ApiPropertyOptional({ description: 'Languages spoken at clinic level e.g. "English, Hindi, Kannada"', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  languages_spoken?: string;

  @ApiPropertyOptional({ description: 'Comma-separated treatment offerings for the directory e.g. "Dental Implants,Root Canal"', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  directory_treatments?: string;

  @ApiPropertyOptional({ description: 'JSON-serialised array of clinic gallery photo URLs', example: '["https://example.com/a.jpg"]' })
  @IsOptional()
  @IsJSON()
  gallery_images?: string;
}
