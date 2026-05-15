import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { PlatformBillingService } from './platform-billing.service.js';
import { CancelInvoiceDto, CreateManualInvoiceDto, MarkPaidOfflineDto } from './dto/create-manual-invoice.dto.js';

class ListAllInvoicesQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'due', 'overdue', 'paid', 'failed', 'cancelled', 'refunded'] })
  @IsOptional()
  @IsIn(['draft', 'due', 'overdue', 'paid', 'failed', 'cancelled', 'refunded'])
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

  @Post()
  @SuperAdmin()
  @ApiOperation({
    summary: 'Manually issue a platform invoice for a clinic',
    description:
      'Creates a due invoice + Razorpay Pay link + sends via WhatsApp & Email. Use this for offline-payment scenarios or to issue an invoice ahead of an automated renewal.',
  })
  create(@Req() req: Request, @Body() dto: CreateManualInvoiceDto) {
    return this.billing.createManualInvoice({
      clinicId: dto.clinic_id,
      planId: dto.plan_id,
      billingCycle: dto.billing_cycle,
      totalAmount: dto.total_amount,
      periodStart: dto.period_start,
      periodEnd: dto.period_end,
      dueDate: dto.due_date ?? null,
      notes: dto.notes ?? null,
      createdByUserId: req.user?.userId ?? null,
      sendImmediately: dto.send_immediately !== false,
    });
  }

  @Post(':id/cancel')
  @SuperAdmin()
  @ApiOperation({ summary: 'Cancel a draft / due / overdue invoice (voids the Pay link)' })
  cancel(@Param('id') id: string, @Body() dto: CancelInvoiceDto) {
    return this.billing.cancelInvoice(id, { reason: dto.reason });
  }

  @Post(':id/refresh-pay-link')
  @SuperAdmin()
  @ApiOperation({ summary: 'Regenerate the Razorpay Payment Link for a due/overdue invoice' })
  async refreshPayLink(@Param('id') id: string) {
    const link = await this.billing.createPaymentLink(id);
    return { id: link.id, short_url: link.short_url, expire_by: link.expire_by };
  }

  @Post(':id/mark-paid-offline')
  @SuperAdmin()
  @ApiOperation({ summary: 'Mark an invoice as paid via offline channel (cash / cheque / bank transfer)' })
  markPaid(@Param('id') id: string, @Body() dto: MarkPaidOfflineDto) {
    return this.billing.markInvoicePaid(id, {
      razorpayPaymentId: dto.payment_reference ? `offline:${dto.payment_reference}` : null,
      paidAt: new Date(),
      appendNote: dto.note ? `Offline payment: ${dto.note}` : null,
    });
  }
}
