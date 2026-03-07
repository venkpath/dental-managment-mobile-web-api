import { IsUUID, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Invoice UUID' })
  @IsUUID()
  invoice_id!: string;

  @ApiProperty({ example: 'upi', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: 2500.0, description: 'Payment amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount!: number;
}
