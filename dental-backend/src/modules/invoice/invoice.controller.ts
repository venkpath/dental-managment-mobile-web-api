import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
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
import { CreateInvoiceDto, CreatePaymentDto, CreateInstallmentPlanDto, QueryInvoiceDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

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
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoiceService.create(clinicId, dto);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices with optional filters' })
  @ApiOkResponse({ description: 'List of invoices' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryInvoiceDto,
  ) {
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
}
