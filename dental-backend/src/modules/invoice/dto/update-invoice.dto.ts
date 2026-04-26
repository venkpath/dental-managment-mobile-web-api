import { IsOptional, IsUUID, IsString, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Partial-update payload for an existing invoice.
 * Currently supports updating the treating dentist and GST number.
 * Totals/items/payments are managed by their dedicated endpoints.
 */
export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: 'Treating dentist (User) UUID. Pass null to clear.' })
  @IsOptional()
  @IsUUID()
  dentist_id?: string | null;

  @ApiPropertyOptional({
    example: '22AAAAA0000A1Z5',
    maxLength: 20,
    description: 'GST number (India). Format: 15-char alphanumeric.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gst_number must be a valid 15-character GSTIN',
  })
  gst_number?: string;
}
