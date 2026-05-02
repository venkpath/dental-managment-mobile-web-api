import { IsUUID, IsNumber, IsEnum, Min, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum RefundMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
}

export class CreateRefundDto {
  @ApiPropertyOptional({
    description:
      'Optional payment UUID being reversed. When omitted the refund is treated as a generic credit against the invoice (e.g. cancelled treatment with no clear single source payment).',
  })
  @IsOptional()
  @IsUUID()
  payment_id?: string;

  @ApiProperty({ example: 'cash', enum: RefundMethod, description: 'How the money was returned to the patient' })
  @IsEnum(RefundMethod)
  method!: RefundMethod;

  @ApiProperty({ example: 500.0, description: 'Refund amount (positive number).' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({
    example: 'Patient cancelled the second sitting — refund for unused composite material',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
