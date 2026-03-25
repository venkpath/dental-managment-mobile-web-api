import { IsArray, IsString, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ImportPatientRow {
  @ApiProperty({ example: 'John' })
  @IsString()
  first_name!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  last_name!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ example: 'john@email.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '30' })
  @IsOptional()
  age?: number | string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  blood_group?: string;

  @ApiPropertyOptional({ example: 'Penicillin' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ example: 'Regular patient' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkImportDto {
  @ApiProperty({ description: 'Branch ID to assign imported patients to' })
  @IsUUID()
  branch_id!: string;

  @ApiProperty({ type: [ImportPatientRow], description: 'Array of patient rows' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPatientRow)
  patients!: ImportPatientRow[];
}

export class ImageImportDto {
  @ApiProperty({ description: 'Branch ID to assign imported patients to' })
  @IsUUID()
  branch_id!: string;
}
