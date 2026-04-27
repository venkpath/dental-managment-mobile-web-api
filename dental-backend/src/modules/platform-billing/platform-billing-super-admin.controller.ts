import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { PlatformBillingService } from './platform-billing.service.js';

class ListAllInvoicesQueryDto {
  @ApiPropertyOptional({ enum: ['paid', 'failed', 'refunded'] })
  @IsOptional()
  @IsIn(['paid', 'failed', 'refunded'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by clinic id' })
  @IsOptional()
  @IsUUID()
  clinic_id?: string;

  @ApiPropertyOptional({ description: 'Search invoice number, clinic name, email, or razorpay payment id' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'ISO date — issued_at >= from_date' })
  @IsOptional()
  @IsString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'ISO date — issued_at <= to_date' })
  @IsOptional()
  @IsString()
  to_date?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * Cross-clinic platform-billing endpoints for super admins.
 * Mounted under /super-admins/* alongside the rest of the super-admin API.
 */
@ApiTags('Super Admin · Platform Billing')
@Controller('super-admins/platform-invoices')
export class PlatformBillingSuperAdminController {
  constructor(private readonly billing: PlatformBillingService) {}

  @Get()
  @SuperAdmin()
  @ApiOperation({ summary: 'List subscription invoices across all clinics' })
  list(@Query() query: ListAllInvoicesQueryDto) {
    return this.billing.listAllInvoicesForSuperAdmin({
      status: query.status,
      clinicId: query.clinic_id,
      search: query.search,
      fromDate: query.from_date,
      toDate: query.to_date,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get a single platform invoice (super-admin scope)' })
  get(@Param('id') id: string) {
    return this.billing.getInvoiceForSuperAdmin(id);
  }

  @Get(':id/pdf')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get a signed PDF download URL for any clinic\'s invoice' })
  getPdf(@Param('id') id: string) {
    return this.billing.getInvoicePdfUrlForSuperAdmin(id);
  }

  @Post(':id/resend')
  @SuperAdmin()
  @ApiOperation({ summary: 'Re-send the invoice to the clinic via WhatsApp + Email' })
  resend(@Param('id') id: string) {
    return this.billing.resendInvoiceForSuperAdmin(id);
  }
}
