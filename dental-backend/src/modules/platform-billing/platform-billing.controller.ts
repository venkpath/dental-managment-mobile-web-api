import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PlatformBillingService } from './platform-billing.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { ListPlatformInvoicesQueryDto } from './dto/list-invoices-query.dto.js';

@ApiTags('Platform Billing')
@ApiBearerAuth()
@Controller('platform-billing')
export class PlatformBillingController {
  constructor(private readonly billing: PlatformBillingService) {}

  @Get('invoices')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List subscription invoices issued to this clinic' })
  list(@Req() req: Request, @Query() query: ListPlatformInvoicesQueryDto) {
    return this.billing.listInvoicesForClinic(req.user!.clinicId, query);
  }

  // NOTE: literal-segment routes (`/outstanding`) must be declared before
  // the `:id` route, otherwise Express matches `outstanding` as an id.
  @Get('invoices/outstanding')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List unpaid (due + overdue) invoices for the current clinic' })
  outstanding(@Req() req: Request) {
    return this.billing.listOutstandingInvoices(req.user!.clinicId);
  }

  @Get('invoices/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a single platform invoice with full breakup' })
  get(@Req() req: Request, @Param('id') id: string) {
    return this.billing.getInvoice(req.user!.clinicId, id);
  }

  @Get('invoices/:id/pdf')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a signed download URL for the invoice PDF' })
  getPdf(@Req() req: Request, @Param('id') id: string) {
    return this.billing.getInvoicePdfUrl(req.user!.clinicId, id);
  }

  @Get('invoices/:id/pay-link')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get the Razorpay-hosted Pay link for a due invoice (regenerated if missing)' })
  payLink(@Req() req: Request, @Param('id') id: string) {
    return this.billing.getPaymentLinkForClinic(req.user!.clinicId, id);
  }

  @Post('invoices/:id/resend')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Re-send the invoice via WhatsApp + Email' })
  resend(@Req() req: Request, @Param('id') id: string) {
    return this.billing.resendInvoice(req.user!.clinicId, id);
  }
}
