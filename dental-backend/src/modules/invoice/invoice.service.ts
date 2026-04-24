import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { CreateInvoiceDto, CreatePaymentDto, CreateInstallmentPlanDto, QueryInvoiceDto } from './dto/index.js';
import { Invoice, Payment, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { getCurrencySymbol, getCurrencyLocale } from '../../common/utils/currency.util.js';

const INVOICE_INCLUDE = {
  items: { include: { treatment: { include: { dentist: true } } } },
  payments: { include: { installment_item: true }, orderBy: { paid_at: 'asc' as const } },
  patient: true,
  branch: true,
  clinic: true,
  installment_plan: { include: { items: { orderBy: { installment_number: 'asc' as const } } } },
} as const;

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly s3Service: S3Service,
  ) {}

  async create(clinicId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const [branch, patient] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
      this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
    ]);

    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
    }

    // Validate treatment_ids belong to this clinic
    const treatmentIds = dto.items
      .map((item) => item.treatment_id)
      .filter((id): id is string => id !== undefined);

    if (treatmentIds.length > 0) {
      const treatments = await this.prisma.treatment.findMany({
        where: { id: { in: treatmentIds }, clinic_id: clinicId },
      });
      if (treatments.length !== treatmentIds.length) {
        throw new NotFoundException('One or more treatment IDs not found in this clinic');
      }
    }

    // Calculate totals
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );
    const discountAmount = dto.discount_amount ?? 0;
    const taxableAmount = totalAmount - discountAmount;
    const taxPercent = dto.tax_percentage ?? 0;
    const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
    const netAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    const { items, tax_percentage, tax_breakdown, ...rest } = dto;

    // Transaction: generate invoice number + create invoice with items atomically
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(clinicId, tx);

      return tx.invoice.create({
        data: {
          clinic_id: clinicId,
          branch_id: rest.branch_id,
          patient_id: rest.patient_id,
          invoice_number: invoiceNumber,
          total_amount: new Prisma.Decimal(totalAmount),
          tax_amount: new Prisma.Decimal(taxAmount),
          discount_amount: new Prisma.Decimal(discountAmount),
          net_amount: new Prisma.Decimal(netAmount),
          gst_number: rest.gst_number,
          tax_breakdown: tax_breakdown as Prisma.InputJsonValue ?? undefined,
          items: {
            create: items.map((item) => ({
              treatment_id: item.treatment_id,
              item_type: item.item_type,
              description: item.description,
              quantity: item.quantity,
              unit_price: new Prisma.Decimal(item.unit_price),
              total_price: new Prisma.Decimal(
                Math.round(item.quantity * item.unit_price * 100) / 100,
              ),
            })),
          },
        },
        include: INVOICE_INCLUDE,
      });
    });
  }

  async findAll(clinicId: string, query: QueryInvoiceDto): Promise<PaginatedResult<Invoice>> {
    const where: Prisma.InvoiceWhereInput = { clinic_id: clinicId };

    if (query.patient_id) {
      where.patient_id = query.patient_id;
    }
    if (query.branch_id) {
      where.branch_id = query.branch_id;
    }
    if (query.status) {
      where.status = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: INVOICE_INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice || invoice.clinic_id !== clinicId) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }
    return invoice;
  }

  async addPayment(clinicId: string, dto: CreatePaymentDto): Promise<Payment> {
    const invoice = await this.findOne(clinicId, dto.invoice_id);

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already fully paid');
    }

    // Transaction: check balance + create payment + update invoice status atomically
    const payment = await this.prisma.$transaction(async (tx) => {
      const existingPayments = await tx.payment.aggregate({
        where: { invoice_id: dto.invoice_id },
        _sum: { amount: true },
      });
      const paidSoFar = Number(existingPayments._sum.amount ?? 0);
      const remaining = Number(invoice.net_amount) - paidSoFar;

      if (dto.amount > remaining + 0.01) {
        throw new BadRequestException(
          `Payment amount (${dto.amount}) exceeds remaining balance (${remaining.toFixed(2)})`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          invoice_id: dto.invoice_id,
          installment_item_id: dto.installment_item_id,
          method: dto.method,
          amount: new Prisma.Decimal(dto.amount),
          notes: dto.notes,
        },
      });

      // If payment is against an installment item, mark it as paid
      if (dto.installment_item_id) {
        const installmentPayments = await tx.payment.aggregate({
          where: { installment_item_id: dto.installment_item_id },
          _sum: { amount: true },
        });
        const installmentItem = await tx.installmentItem.findUnique({
          where: { id: dto.installment_item_id },
        });
        if (installmentItem && Number(installmentPayments._sum.amount ?? 0) >= Number(installmentItem.amount) - 0.01) {
          await tx.installmentItem.update({
            where: { id: dto.installment_item_id },
            data: { status: 'paid', paid_at: new Date() },
          });
        }
      }

      // Update invoice status
      const newTotal = paidSoFar + dto.amount;
      if (newTotal >= Number(invoice.net_amount) - 0.01) {
        await tx.invoice.update({
          where: { id: dto.invoice_id },
          data: { status: 'paid' },
        });
      } else if (newTotal > 0.01) {
        await tx.invoice.update({
          where: { id: dto.invoice_id },
          data: { status: 'partially_paid' },
        });
      }

      return payment;
    });

    // Send payment confirmation to patient (fire-and-forget)
    this.sendPaymentConfirmation(clinicId, invoice.patient_id, invoice.invoice_number, dto.amount, dto.invoice_id).catch((e) =>
      this.logger.warn(`Payment confirmation failed: ${(e as Error).message}`),
    );

    return payment;
  }

  async createInstallmentPlan(clinicId: string, dto: CreateInstallmentPlanDto) {
    const invoiceId = dto.invoice_id!;
    const invoice = await this.findOne(clinicId, invoiceId);

    // Verify no existing plan
    const existingPlan = await this.prisma.installmentPlan.findUnique({
      where: { invoice_id: invoiceId },
    });
    if (existingPlan) {
      throw new BadRequestException('An installment plan already exists for this invoice');
    }

    // Verify total of installments matches invoice net_amount
    const installmentTotal = dto.items.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(installmentTotal - Number(invoice.net_amount)) > 0.01) {
      throw new BadRequestException(
        `Installment total (${installmentTotal.toFixed(2)}) must equal invoice net amount (${Number(invoice.net_amount).toFixed(2)})`,
      );
    }

    return this.prisma.installmentPlan.create({
      data: {
        invoice_id: invoiceId,
        total_amount: new Prisma.Decimal(installmentTotal),
        num_installments: dto.items.length,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            installment_number: item.installment_number,
            amount: new Prisma.Decimal(item.amount),
            due_date: new Date(item.due_date),
          })),
        },
      },
      include: { items: { orderBy: { installment_number: 'asc' } } },
    });
  }

  async deleteInstallmentPlan(clinicId: string, invoiceId: string) {
    // Validate invoice belongs to clinic
    await this.findOne(clinicId, invoiceId);

    const plan = await this.prisma.installmentPlan.findUnique({
      where: { invoice_id: invoiceId },
    });
    if (!plan) {
      throw new NotFoundException('No installment plan found for this invoice');
    }

    // Check if any installment payments have been made
    const paidInstallments = await this.prisma.payment.count({
      where: { invoice_id: invoiceId, installment_item_id: { not: null } },
    });
    if (paidInstallments > 0) {
      throw new BadRequestException('Cannot delete installment plan with existing payments against it');
    }

    await this.prisma.installmentPlan.delete({ where: { id: plan.id } });
    return { message: 'Installment plan deleted' };
  }

  async getPdfUrl(clinicId: string, invoiceId: string): Promise<{ url: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        ...INVOICE_INCLUDE,
        clinic: true,
      },
    });

    if (!invoice || invoice.clinic_id !== clinicId) {
      throw new NotFoundException(`Invoice with ID "${invoiceId}" not found`);
    }

    const s3Key = `invoices/${clinicId}/${invoice.invoice_number}.pdf`;

    // Generate fresh PDF every time (reflects latest payment status)
    const pdfData = {
      invoice_number: invoice.invoice_number,
      created_at: invoice.created_at,
      gst_number: invoice.gst_number,
      total_amount: Number(invoice.total_amount),
      discount_amount: Number(invoice.discount_amount),
      tax_amount: Number(invoice.tax_amount),
      net_amount: Number(invoice.net_amount),
      clinic: {
        name: (invoice as any).clinic.name,
        email: (invoice as any).clinic.email,
        phone: (invoice as any).clinic.phone,
        address: (invoice as any).clinic.address,
        city: (invoice as any).clinic.city,
        state: (invoice as any).clinic.state,
      },
      branch: {
        name: (invoice as any).branch.name,
        phone: (invoice as any).branch.phone,
        address: (invoice as any).branch.address,
        city: (invoice as any).branch.city,
        state: (invoice as any).branch.state,
      },
      patient: {
        first_name: (invoice as any).patient.first_name,
        last_name: (invoice as any).patient.last_name,
        phone: (invoice as any).patient.phone,
        email: (invoice as any).patient.email,
        date_of_birth: (invoice as any).patient.date_of_birth,
      },
      dentist: (() => {
        const firstDentist = (invoice as any).items
          .map((i: any) => i.treatment?.dentist)
          .find((d: any) => d != null);
        if (!firstDentist) return null;
        return {
          name: firstDentist.name,
          specialization: firstDentist.role === 'dentist' ? 'General Dentistry' : firstDentist.role,
          license_number: null,
        };
      })(),
      items: (invoice as any).items.map((item: any) => ({
        item_type: item.item_type,
        description: item.description,
        procedure: item.treatment?.procedure ?? null,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        tooth_number: item.treatment?.tooth_number ?? null,
      })),
      payments: (invoice as any).payments.map((p: any) => ({
        amount: Number(p.amount),
        method: p.method,
        paid_at: p.paid_at,
      })),
      currency_code: (invoice as any).clinic.currency_code ?? 'INR',
    };

    const pdfBuffer = await this.invoicePdfService.generate(pdfData);
    await this.s3Service.upload(s3Key, pdfBuffer, 'application/pdf');
    const url = await this.s3Service.getSignedUrl(s3Key);

    return { url };
  }

  async sendWhatsApp(clinicId: string, invoiceId: string): Promise<{ message: string }> {
    const invoice = await this.findOne(clinicId, invoiceId);

    // Generate / refresh PDF so it's current
    await this.getPdfUrl(clinicId, invoiceId);

    const [patient, clinic, rule] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: invoice.patient_id },
        select: { first_name: true, last_name: true, phone: true },
      }),
      this.prisma.clinic.findUnique({
        where: { id: clinicId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select: { name: true, phone: true, currency_code: true } as any,
      }) as Promise<{ name: string; phone: string | null; currency_code: string } | null>,
      this.automationService.getRuleConfig(clinicId, 'invoice_ready'),
    ]);
    if (!patient) throw new Error('Patient not found');

    if (rule && !rule.is_enabled) {
      return { message: 'Invoice WhatsApp notification is disabled' };
    }

    const currencyCode = clinic?.currency_code ?? 'INR';
    const patientName = `${patient.first_name} ${patient.last_name}`;
    const netAmount = Number(invoice.net_amount).toLocaleString(getCurrencyLocale(currencyCode), { minimumFractionDigits: 2 });
    const netAmountFormatted = `${getCurrencySymbol(currencyCode)} ${netAmount}`;
    const clinicName = clinic?.name ?? 'your clinic';
    const clinicPhone = clinic?.phone ?? '';
    const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
    const redirectUrl = `${apiBase}/public/invoice-redirect/${invoiceId}?clinic=${clinicId}`;

    const channel = rule?.channel ?? 'whatsapp';

    await this.communicationService.sendMessage(clinicId, {
      patient_id: invoice.patient_id,
      channel: channel as any,
      category: MessageCategory.TRANSACTIONAL,
      template_id: rule?.template_id ?? undefined,
      body: rule?.template_id
        ? undefined
        : `Hello ${patientName},\n\nYour payment receipt has been generated.\n\nClinic: ${clinicName}\nInvoice No: ${invoice.invoice_number}\nAmount: ${netAmountFormatted}\n\nView & Download Invoice:\n${redirectUrl}\n\nFor any queries, please reach us at ${clinicPhone} during clinic hours.`,
      variables: {
        '1': patientName,
        '2': clinicName,
        '3': invoice.invoice_number,
        '4': netAmountFormatted,
        '5': clinicPhone,
        '6': redirectUrl,
      },
      metadata: { automation: 'invoice_ready', invoice_id: invoiceId },
    });

    return { message: 'Invoice sent via WhatsApp' };
  }

  private async generateInvoiceNumber(
    clinicId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${dateStr}`;

    const lastInvoice = await tx.invoice.findFirst({
      where: {
        clinic_id: clinicId,
        invoice_number: { startsWith: prefix },
      },
      orderBy: { invoice_number: 'desc' },
    });

    let seq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoice_number.split('-').pop() ?? '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}-${seq.toString().padStart(4, '0')}`;
  }

  private async sendPaymentConfirmation(
    clinicId: string,
    patientId: string,
    invoiceNumber: string,
    amount: number,
    invoiceId: string,
  ): Promise<void> {
    const [patient, clinic, rule] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: patientId }, select: { first_name: true, last_name: true } }),
      this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, phone: true, currency_code: true } as any }) as Promise<{ name: string; phone: string | null; currency_code: string } | null>,
      this.automationService.getRuleConfig(clinicId, 'payment_confirmation'),
    ]);
    if (!patient) return;
    if (rule && !rule.is_enabled) return;

    // Determine channel: use rule config, or fall back to clinic settings
    let channel: MessageChannel | null = null;
    if (rule?.channel && rule.channel !== 'preferred') {
      channel = rule.channel as MessageChannel;
    } else {
      const settings = await this.prisma.clinicCommunicationSettings.findUnique({ where: { clinic_id: clinicId } });
      channel = settings?.enable_whatsapp
        ? MessageChannel.WHATSAPP
        : settings?.enable_sms
          ? MessageChannel.SMS
          : settings?.enable_email
            ? MessageChannel.EMAIL
            : null;
    }
    if (!channel) return;

    // Generate PDF so S3 link is fresh
    try { await this.getPdfUrl(clinicId, invoiceId); } catch { /* non-fatal */ }

    const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
    const receiptUrl = `${apiBase}/public/invoice-redirect/${invoiceId}?clinic=${clinicId}`;
    const currCode = clinic?.currency_code ?? 'INR';
    const formattedAmount = `${getCurrencySymbol(currCode)}${amount.toLocaleString(getCurrencyLocale(currCode))}`;
    const clinicName = clinic?.name || 'Your Dental Clinic';
    const clinicPhone = clinic?.phone || '';

    await this.communicationService.sendMessage(clinicId, {
      patient_id: patientId,
      channel,
      category: MessageCategory.TRANSACTIONAL,
      template_id: rule?.template_id ?? undefined,
      body: rule?.template_id
        ? undefined
        : `Hi ${patient.first_name},\n\nWe have received your payment of ${formattedAmount} for invoice ${invoiceNumber} at ${clinicName}.\n\nYour receipt is ready. View & download:\n${receiptUrl}\n\nPlease call us ${clinicPhone} for any queries.`,
      variables: {
        '1': patient.first_name,
        '2': formattedAmount,
        '3': invoiceNumber,
        '4': clinicName,
        '5': receiptUrl,
        '6': clinicPhone,
      },
      metadata: { automation: 'payment_confirmation', invoice_id: invoiceId },
    });
  }
}
