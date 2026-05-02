import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Redirect,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service.js';
import { CreateInvoiceDto, CreatePaymentDto, CreateInstallmentPlanDto, QueryInvoiceDto, CancelInvoiceDto, CreateRefundDto } from './dto/index.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/index.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { applyDentistScope } from '../../common/utils/dentist-scope.util.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';

/**
 * Public controller — no auth guard.
 * Handles the WhatsApp invoice redirect link which is opened in a browser.
 */
@ApiTags('Invoices & Payments')
@Public()
@Controller()
export class InvoicePublicController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * Public redirect endpoint — used in WhatsApp template button URL.
   * URL pattern: {API_BASE_URL}/public/invoice-redirect/{{invoiceId}}?clinic={{clinicId}}
   * No auth required — invoice ID alone is not sensitive; S3 URL is time-limited.
   */
  @Get('public/invoice-redirect/:id')
  @Redirect()
  @ApiOperation({ summary: 'Redirect WhatsApp link to a fresh S3 signed PDF URL' })
  async invoiceRedirect(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clinic') clinicId: string,
  ) {
    const { url } = await this.invoiceService.getPdfUrl(clinicId, id);
    return { url, statusCode: 302 };
  }
}

@ApiTags('Invoices & Payments')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('invoices')
  @ApiOperation({ summary: 'Create an invoice with line items' })
  @ApiCreatedResponse({ description: 'Invoice created successfully' })
  async createInvoice(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoiceService.create(clinicId, dto, user.sub);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices with optional filters' })
  @ApiOkResponse({ description: 'List of invoices' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryInvoiceDto,
  ) {
    applyDentistScope(query, user);
    return this.invoiceService.findAll(clinicId, query);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get an invoice by ID with items and payments' })
  @ApiOkResponse({ description: 'Invoice found' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.findOne(clinicId, id);
  }

  @Patch('invoices/:id')
  @ApiOperation({ summary: 'Update a DRAFT invoice (e.g. assign treating dentist, GST number). Issued invoices cannot be edited.' })
  @ApiOkResponse({ description: 'Invoice updated' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiBadRequestResponse({ description: 'Invoice is not in draft state' })
  async updateInvoice(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(clinicId, id, dto);
  }

  @Post('invoices/:id/issue')
  @ApiOperation({ summary: 'Issue a DRAFT invoice — locks it from edits and makes it shareable with the patient.' })
  @ApiOkResponse({ description: 'Invoice issued' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiBadRequestResponse({ description: 'Invoice is already issued or cancelled' })
  async issueInvoice(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.issueInvoice(clinicId, id, user.sub);
  }

  @Post('invoices/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel an invoice (admin only). Cannot cancel invoices with recorded payments — refund first.' })
  @ApiOkResponse({ description: 'Invoice cancelled' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiBadRequestResponse({ description: 'Invoice already cancelled, or has recorded payments' })
  async cancelInvoice(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.invoiceService.cancelInvoice(clinicId, id, user.sub, dto.reason);
  }

  @Post('payments')
  @ApiOperation({ summary: 'Record a payment against an invoice (supports installments)' })
  @ApiCreatedResponse({ description: 'Payment recorded successfully' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiBadRequestResponse({ description: 'Invoice already paid or amount exceeds balance' })
  async createPayment(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.invoiceService.addPayment(clinicId, dto);
  }

  @Post('invoices/:id/refunds')
  @ApiOperation({ summary: 'Refund (fully or partially) money already collected against an invoice.' })
  @ApiCreatedResponse({ description: 'Refund recorded' })
  @ApiNotFoundResponse({ description: 'Invoice or referenced payment not found' })
  @ApiBadRequestResponse({ description: 'Refund exceeds refundable balance, or invoice is in draft' })
  async createRefund(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.invoiceService.addRefund(clinicId, id, dto, user.sub);
  }

  @Post('invoices/:id/installment-plan')
  @ApiOperation({ summary: 'Create an installment plan for an invoice' })
  @ApiCreatedResponse({ description: 'Installment plan created' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  @ApiBadRequestResponse({ description: 'Plan already exists or total mismatch' })
  async createInstallmentPlan(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInstallmentPlanDto,
  ) {
    dto.invoice_id = id;
    return this.invoiceService.createInstallmentPlan(clinicId, dto);
  }

  @Delete('invoices/:id/installment-plan')
  @ApiOperation({ summary: 'Delete an installment plan (only if no payments made against it)' })
  @ApiOkResponse({ description: 'Installment plan deleted' })
  async deleteInstallmentPlan(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.deleteInstallmentPlan(clinicId, id);
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Generate invoice PDF, upload to S3, return signed URL (valid 1 hour)' })
  @ApiOkResponse({ description: 'Signed S3 URL for the invoice PDF' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async getPdfUrl(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.getPdfUrl(clinicId, id);
  }

  @Post('invoices/:id/send-whatsapp')
  @ApiOperation({ summary: 'Send invoice PDF link to patient via WhatsApp' })
  @ApiOkResponse({ description: 'WhatsApp message sent' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async sendWhatsApp(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.sendWhatsApp(clinicId, id);
  }
}
