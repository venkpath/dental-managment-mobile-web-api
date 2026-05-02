import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelInvoiceDto {
  @ApiPropertyOptional({
    example: 'Patient was double-billed by mistake',
    maxLength: 500,
    description: 'Free-form reason printed on the cancelled invoice copy and stored for audit.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
