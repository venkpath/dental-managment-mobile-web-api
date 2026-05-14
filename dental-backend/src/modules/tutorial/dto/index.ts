import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../user/dto/create-user.dto.js';

// Derived from the canonical UserRole enum so a new role added there
// automatically becomes a valid tutorial audience. SuperAdmin is excluded
// because super-admins use the platform-wide admin endpoints, not /tutorials.
const ROLES = Object.values(UserRole)
  .filter((r) => r !== UserRole.SUPER_ADMIN)
  .map((r) => r.toLowerCase());
export type AllowedRole = (typeof ROLES)[number];

export class CreateTutorialDto {
  @ApiProperty({ example: 'Getting Started with Billing' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'tutorials/getting-started.mp4', description: 'S3 object key inside the configured bucket' })
  @IsString()
  @MaxLength(500)
  s3_key!: string;

  @ApiPropertyOptional({ example: 'tutorials/thumbnails/getting-started.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail_s3_key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_seconds?: number;

  @ApiPropertyOptional({ example: 'Billing' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiProperty({
    description: 'Lowercase role names that can see this tutorial',
    example: ['admin', 'dentist'],
    isArray: true,
    enum: ROLES,
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(ROLES, { each: true })
  allowed_roles!: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class UpdateTutorialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  s3_key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail_s3_key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_seconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ isArray: true, enum: ROLES })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(ROLES, { each: true })
  allowed_roles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class UpdateProgressDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  last_position_seconds!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
