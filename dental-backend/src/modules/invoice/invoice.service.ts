import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateInvoiceDto, CreatePaymentDto, QueryInvoiceDto } from './dto/index.js';
import { Invoice, Payment, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';

const INVOICE_INCLUDE = {
  items: { include: { treatment: true } },
  payments: true,
  patient: true,
  branch: true,
} as const;

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

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
    const taxPercent = dto.tax_percent ?? 0;
    const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
    const netAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    const { items, tax_percent, tax_breakdown, ...rest } = dto;

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
    return this.prisma.$transaction(async (tx) => {
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
          method: dto.method,
          amount: new Prisma.Decimal(dto.amount),
        },
      });

      // Auto-mark as paid if fully settled
      const newTotal = paidSoFar + dto.amount;
      if (newTotal >= Number(invoice.net_amount) - 0.01) {
        await tx.invoice.update({
          where: { id: dto.invoice_id },
          data: { status: 'paid' },
        });
      }

      return payment;
    });
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
}
