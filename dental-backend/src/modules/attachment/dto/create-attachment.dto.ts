import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export enum AttachmentType {
  XRAY = 'xray',
  REPORT = 'report',
  DOCUMENT = 'document',
}

export class CreateAttachmentDto {
  @ApiProperty({ description: 'Branch ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  branch_id!: string;

  @ApiProperty({ description: 'Patient ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @ApiProperty({ description: 'File URL or storage path', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  file_url!: string;

  @ApiProperty({ description: 'Attachment type', enum: AttachmentType })
  @IsEnum(AttachmentType)
  type!: AttachmentType;

  @ApiProperty({ description: 'User ID who uploaded', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  uploaded_by!: string;
}
