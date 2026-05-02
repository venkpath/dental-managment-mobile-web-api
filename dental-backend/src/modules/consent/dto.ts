import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ConsentSectionDto {
  @ApiProperty({ example: 'Risks I acknowledge' })
  @IsString()
  @MaxLength(255)
  heading!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paragraphs?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bullets?: string[];
}

export class ConsentTemplateBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procedure_clause?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  anaesthesia_options?: string[];

  @ApiProperty({ type: [ConsentSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentSectionDto)
  sections!: ConsentSectionDto[];

  @ApiProperty()
  @IsString()
  consent_statement!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctor_statement?: string;

  @ApiProperty({ type: [String], example: ['patient', 'doctor'] })
  @IsArray()
  @IsIn(['patient', 'guardian', 'witness', 'doctor'], { each: true })
  signature_lines!: Array<'patient' | 'guardian' | 'witness' | 'doctor'>;
}

export class CreateConsentTemplateDto {
  @ApiProperty({ example: 'extraction', description: 'Stable code (slug) — unique per clinic+language' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'en' })
  @IsString()
  @MaxLength(5)
  language!: string;

  @ApiProperty({ example: 'Extraction / Oral Surgery Consent' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ type: ConsentTemplateBodyDto })
  @ValidateNested()
  @Type(() => ConsentTemplateBodyDto)
  body!: ConsentTemplateBodyDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateConsentTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) title?: string;
  @ApiPropertyOptional({ type: ConsentTemplateBodyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentTemplateBodyDto)
  body?: ConsentTemplateBodyDto;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) version?: number;
}

export class AiGenerateConsentTemplateDto {
  @ApiProperty({ example: 'crown_bridge' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'hi' })
  @IsString()
  @MaxLength(5)
  language!: string;

  @ApiProperty({ example: 'Crown / Bridge / Prosthodontic Consent', description: 'Procedure category for the AI to write about.' })
  @IsString()
  @MaxLength(255)
  procedure_category!: string;

  @ApiPropertyOptional({ example: 'PFM crown, zirconia crown, 3-unit bridge' })
  @IsOptional()
  @IsString()
  procedure_examples?: string;

  @ApiPropertyOptional({ enum: ['adult', 'child', 'either'], default: 'adult' })
  @IsOptional()
  @IsIn(['adult', 'child', 'either'])
  audience_age?: 'adult' | 'child' | 'either';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  include_anaesthesia_options?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  include_witness?: boolean;

  @ApiPropertyOptional({ description: 'Free-text clinic context appended to the prompt.' })
  @IsOptional()
  @IsString()
  custom_notes?: string;
}

export class CreatePatientConsentDto {
  @ApiProperty()
  @IsUUID()
  template_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  treatment_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointment_id?: string;

  @ApiPropertyOptional({ description: 'Free-text procedure (interpolated into procedure_clause).' })
  @IsOptional()
  @IsString()
  procedure?: string;
}

export class SignDigitalConsentDto {
  @ApiProperty({ description: 'PNG data URL captured from the in-app signature pad' })
  @IsString()
  signature_data_url!: string;

  @ApiProperty({ example: 'Ramesh Kumar' })
  @IsString()
  @MaxLength(255)
  signed_by_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  witness_staff_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SendConsentLinkDto {
  @ApiPropertyOptional({ enum: ['whatsapp', 'sms'], default: 'whatsapp' })
  @IsOptional()
  @IsIn(['whatsapp', 'sms'])
  channel?: 'whatsapp' | 'sms';

  @ApiPropertyOptional({ minimum: 1, maximum: 168, default: 72 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  expires_in_hours?: number;
}

export class VerifyConsentOtpDto {
  @ApiProperty({ example: '482917' })
  @IsString()
  @Length(4, 8)
  code!: string;
}

export class PublicSignConsentDto {
  @ApiProperty({ description: 'PNG data URL captured from the on-phone signature pad' })
  @IsString()
  signature_data_url!: string;

  @ApiProperty({ example: 'Ramesh Kumar' })
  @IsString()
  @MaxLength(255)
  signed_by_name!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  agreed!: boolean;
}
