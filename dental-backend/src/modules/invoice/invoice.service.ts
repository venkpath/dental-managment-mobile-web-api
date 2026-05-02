import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { CreateInvoiceDto, CreatePaymentDto, CreateInstallmentPlanDto, QueryInvoiceDto, CreateRefundDto } from './dto/index.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';
import { Invoice, Payment, Refund, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { getCurrencySymbol, getCurrencyLocale } from '../../common/utils/currency.util.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';

const INVOICE_INCLUDE = {
  items: { include: { treatment: { include: { dentist: true } } } },
  payments: { include: { installment_item: true }, orderBy: { paid_at: 'asc' as const } },
  refunds: { orderBy: { refunded_at: 'asc' as const } },
  patient: true,
  branch: true,
  clinic: true,
  dentist: true,
  created_by: true,
  installment_plan: { include: { items: { orderBy: { installment_number: 'asc' as const } } } },
} as const;

type InvoiceWithIncludes = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_INCLUDE }>;

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly s3Service: S3Service,
    private readonly planLimit: PlanLimitService,
  ) {}

  async create(clinicId: string, dto: CreateInvoiceDto, createdByUserId?: string): Promise<Invoice> {
    await this.planLimit.enforceMonthlyCap(clinicId, 'invoices');

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

    // Validate dentist (if provided) belongs to this clinic and is a dentist
    if (dto.dentist_id) {
      const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
      if (!dentist || dentist.clinic_id !== clinicId) {
        throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
      }
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

    const { items, tax_percentage, tax_breakdown, as_draft, ...rest } = dto;
    const isDraft = as_draft === true;
    const now = new Date();

    // Transaction: generate invoice number + create invoice with items atomically
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(clinicId, tx);

      return tx.invoice.create({
        data: {
          clinic_id: clinicId,
          branch_id: rest.branch_id,
          patient_id: rest.patient_id,
          dentist_id: rest.dentist_id ?? null,
          created_by_user_id: createdByUserId ?? null,
          treatment_date: rest.treatment_date ? new Date(rest.treatment_date) : null,
          invoice_number: invoiceNumber,
          total_amount: new Prisma.Decimal(totalAmount),
          tax_amount: new Prisma.Decimal(taxAmount),
          discount_amount: new Prisma.Decimal(discountAmount),
          net_amount: new Prisma.Decimal(netAmount),
          gst_number: rest.gst_number,
          tax_breakdown: tax_breakdown as Prisma.InputJsonValue ?? undefined,
          // Lifecycle: drafts have no issued_at/by; immediate-issue invoices
          // record the same user who created them as the issuer.
          lifecycle_status: isDraft ? 'draft' : 'issued',
          issued_at: isDraft ? null : now,
          issued_by_user_id: isDraft ? null : (createdByUserId ?? null),
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
    if (query.dentist_id) {
      where.dentist_id = query.dentist_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.lifecycle_status) {
      where.lifecycle_status = query.lifecycle_status;
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

  async findOne(clinicId: string, id: string): Promise<InvoiceWithIncludes> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice || invoice.clinic_id !== clinicId) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }
    return invoice;
  }

  async update(clinicId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    // Ensure invoice belongs to clinic
    const existing = await this.findOne(clinicId, id);

    // Lifecycle gate: only DRAFT invoices can be edited. Issued invoices are
    // legal documents — corrections happen through credit notes / debit
    // notes, not by silently mutating fields. Cancelled invoices are frozen.
    if (existing.lifecycle_status === 'cancelled') {
      throw new BadRequestException('Cannot edit a cancelled invoice');
    }
    if (existing.lifecycle_status === 'issued') {
      throw new BadRequestException(
        'Cannot edit an issued invoice. Cancel and recreate, or issue a credit note for adjustments.',
      );
    }

    const data: Prisma.InvoiceUpdateInput = {};

    if (dto.dentist_id !== undefined) {
      if (dto.dentist_id === null || dto.dentist_id === '') {
        data.dentist = { disconnect: true };
      } else {
        const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
        if (!dentist || dentist.clinic_id !== clinicId) {
          throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
        }
        data.dentist = { connect: { id: dto.dentist_id } };
      }
    }

    if (dto.gst_number !== undefined) {
      data.gst_number = dto.gst_number;
    }

    if (Object.keys(data).length === 0) {
      return this.findOne(clinicId, id);
    }

    return this.prisma.invoice.update({
      where: { id },
      data,
      include: INVOICE_INCLUDE,
    });
  }

  async addPayment(clinicId: string, dto: CreatePaymentDto): Promise<Payment> {
    const invoice = await this.findOne(clinicId, dto.invoice_id);

    // Lifecycle gate: payments can only be recorded against ISSUED invoices.
    // Drafts are not legally given to the patient yet; cancelled invoices
    // are closed for audit.
    if (invoice.lifecycle_status === 'draft') {
      throw new BadRequestException(
        'Cannot accept payment on a draft invoice. Issue the invoice first.',
      );
    }
    if (invoice.lifecycle_status === 'cancelled') {
      throw new BadRequestException('Cannot accept payment on a cancelled invoice.');
    }

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

  /**
   * Record a refund against an invoice. Stored as a separate row so the
   * original Payment record stays immutable for audit. After insertion the
   * invoice's payment status is recomputed:
   *   - If the entire paid amount has been refunded (sum(refunds) >=
   *     sum(payments)), the invoice becomes `refunded`.
   *   - Otherwise the status reflects what the patient actually paid in
   *     (sum(payments) vs net_amount): so a partial refund on a fully
   *     paid invoice stays `paid` (with the refund tracked separately),
   *     and a partial refund on an under-paid invoice stays
   *     `partially_paid`.
   * Refunded amount is surfaced to the UI/PDF as a separate line item
   * rather than dragging the status down to "Partially Paid", which
   * would incorrectly imply the patient still owes money.
   */
  async addRefund(
    clinicId: string,
    invoiceId: string,
    dto: CreateRefundDto,
    userId?: string,
  ): Promise<Refund> {
    const invoice = await this.findOne(clinicId, invoiceId);

    if (invoice.lifecycle_status === 'draft') {
      throw new BadRequestException('Cannot refund a draft invoice — no payments exist yet');
    }

    return this.prisma.$transaction(async (tx) => {
      // Validate the optional payment link belongs to this invoice. Done
      // inside the transaction so the payment row can't disappear between
      // the check and the refund insert.
      if (dto.payment_id) {
        const payment = await tx.payment.findUnique({
          where: { id: dto.payment_id },
        });
        if (!payment || payment.invoice_id !== invoiceId) {
          throw new NotFoundException(`Payment "${dto.payment_id}" not found on this invoice`);
        }
      }

      // Refund amount cannot exceed the net positive paid balance —
      // otherwise we'd be paying the patient more than they ever paid us.
      // Aggregate inside the tx so two concurrent refunds don't both pass
      // the check by reading the same pre-state.
      const [paidAgg, refundAgg] = await Promise.all([
        tx.payment.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
        tx.refund.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
      ]);
      const totalPaid = Number(paidAgg._sum.amount ?? 0);
      const totalRefunded = Number(refundAgg._sum.amount ?? 0);
      const refundable = totalPaid - totalRefunded;

      if (dto.amount > refundable + 0.01) {
        throw new BadRequestException(
          `Refund amount (${dto.amount}) exceeds refundable balance (${refundable.toFixed(2)})`,
        );
      }

      const refund = await tx.refund.create({
        data: {
          clinic_id: clinicId,
          invoice_id: invoiceId,
          payment_id: dto.payment_id ?? null,
          amount: new Prisma.Decimal(dto.amount),
          method: dto.method,
          reason: dto.reason ?? null,
          refunded_by_user_id: userId ?? null,
        },
      });

      // Recompute payment status after the refund. The status reflects
      // both the patient's payment liability and the refund posture:
      //   - All money refunded back → `refunded`
      //   - Some refund on a fully-paid invoice → `partially_refunded`
      //     (clinic kept some of the money, returned the rest)
      //   - Otherwise → status follows total payments vs net_amount
      //     (`paid` / `partially_paid` / `pending`)
      const newTotalRefunded = totalRefunded + dto.amount;
      const netAmount = Number(invoice.net_amount);
      let newStatus: 'pending' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' = 'pending';
      if (totalPaid > 0.01 && newTotalRefunded >= totalPaid - 0.01) {
        newStatus = 'refunded';
      } else if (totalPaid >= netAmount - 0.01 && newTotalRefunded > 0.01) {
        newStatus = 'partially_refunded';
      } else if (totalPaid >= netAmount - 0.01) {
        newStatus = 'paid';
      } else if (totalPaid > 0.01) {
        newStatus = 'partially_paid';
      }
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });

      return refund;
    }, {
      // Serializable so two concurrent refund tx's against the same invoice
      // can't both observe the same pre-state and over-refund.
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  /**
   * Transition a DRAFT invoice to ISSUED. Once issued, the invoice can no
   * longer be edited (only cancelled or refunded). The user who issues is
   * recorded so we can answer "who finalized this?" later.
   */
  async issueInvoice(clinicId: string, invoiceId: string, userId?: string): Promise<Invoice> {
    const invoice = await this.findOne(clinicId, invoiceId);

    if (invoice.lifecycle_status === 'issued') {
      throw new BadRequestException('Invoice is already issued');
    }
    if (invoice.lifecycle_status === 'cancelled') {
      throw new BadRequestException('Cannot issue a cancelled invoice');
    }
    // Anything else here would be a draft.

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        lifecycle_status: 'issued',
        issued_at: new Date(),
        issued_by_user_id: userId ?? null,
      },
      include: INVOICE_INCLUDE,
    });
  }

  /**
   * Cancel an ISSUED invoice. Only allowed when no payments have been
   * recorded — otherwise the staff member needs to refund first. Cancelled
   * invoices remain in the books (we never delete) so the invoice number
   * series stays gap-free for tax compliance.
   */
  async cancelInvoice(
    clinicId: string,
    invoiceId: string,
    userId?: string,
    reason?: string,
  ): Promise<Invoice> {
    const invoice = await this.findOne(clinicId, invoiceId);

    if (invoice.lifecycle_status === 'cancelled') {
      throw new BadRequestException('Invoice is already cancelled');
    }
    // Drafts are allowed to transition straight to cancelled — useful for
    // hiding abandoned drafts from the list view without deleting them.

    // An invoice can be cancelled only when no money is currently with the
    // clinic — i.e. either no payments at all, or any payments have been
    // fully refunded back to the patient.
    const [paidAgg, refundAgg] = await Promise.all([
      this.prisma.payment.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
      this.prisma.refund.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
    ]);
    const netPaid = Number(paidAgg._sum.amount ?? 0) - Number(refundAgg._sum.amount ?? 0);
    if (netPaid > 0.01) {
      throw new BadRequestException(
        `Cannot cancel an invoice with ${netPaid.toFixed(2)} still held against it. Refund the patient first.`,
      );
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        lifecycle_status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by_user_id: userId ?? null,
        cancel_reason: reason ?? null,
      },
      include: INVOICE_INCLUDE,
    });
  }

  async createInstallmentPlan(clinicId: string, dto: CreateInstallmentPlanDto) {
    const invoiceId = dto.invoice_id!;
    const invoice = await this.findOne(clinicId, invoiceId);

    // Lifecycle gate: drafts are not yet legal documents and cancelled
    // invoices are frozen — neither can carry an installment plan.
    if (invoice.lifecycle_status === 'draft') {
      throw new BadRequestException(
        'Cannot create an installment plan on a draft invoice. Issue the invoice first.',
      );
    }
    if (invoice.lifecycle_status === 'cancelled') {
      throw new BadRequestException('Cannot create an installment plan on a cancelled invoice.');
    }

    // Verify no existing plan
    const existingPlan = await this.prisma.installmentPlan.findUnique({
      where: { invoice_id: invoiceId },
    });
    if (existingPlan) {
      throw new BadRequestException('An installment plan already exists for this invoice');
    }

    // Verify the installment total equals the OUTSTANDING balance
    // (net_amount − payments + refunds), not the invoice's net amount.
    // The frontend splits "balance due" into installments, so when any
    // payment has already been recorded those two numbers diverge and
    // comparing against net_amount would always fail.
    const [paidAgg, refundAgg] = await Promise.all([
      this.prisma.payment.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
      this.prisma.refund.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
    ]);
    const balance =
      Number(invoice.net_amount) -
      Number(paidAgg._sum.amount ?? 0) +
      Number(refundAgg._sum.amount ?? 0);

    const installmentTotal = dto.items.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(installmentTotal - balance) > 0.01) {
      throw new BadRequestException(
        `Installment total (${installmentTotal.toFixed(2)}) must equal outstanding balance (${balance.toFixed(2)})`,
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
    const invoice = await this.findOne(clinicId, invoiceId);

    // Cancelled invoices are frozen — leave their (now-defunct) plan in
    // place for audit. Drafts shouldn't have plans (gated on create) but
    // be defensive in case one slipped through.
    if (invoice.lifecycle_status === 'cancelled') {
      throw new BadRequestException('Cannot modify an installment plan on a cancelled invoice.');
    }

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
    const invoice = await this.findOne(clinicId, invoiceId);

    const s3Key = `invoices/${clinicId}/${invoice.invoice_number}.pdf`;

    // Pre-fetch the creator's signature image so the PDF is self-contained
    // (no live URL fetch needed when reprinting). Falls back gracefully if
    // the user has not uploaded a signature.
    const creator = invoice.created_by;
    let creatorSignature: Buffer | null = null;
    if (creator?.signature_url) {
      try {
        creatorSignature = await this.s3Service.getObject(creator.signature_url);
      } catch (e) {
        this.logger.warn(`Could not load creator signature: ${(e as Error).message}`);
      }
    }

    // Generate fresh PDF every time (reflects latest payment status)
    const pdfData = {
      invoice_number: invoice.invoice_number,
      created_at: invoice.created_at,
      treatment_date: invoice.treatment_date,
      lifecycle_status: invoice.lifecycle_status,
      cancel_reason: invoice.cancel_reason,
      gst_number: invoice.gst_number,
      total_amount: Number(invoice.total_amount),
      discount_amount: Number(invoice.discount_amount),
      tax_amount: Number(invoice.tax_amount),
      net_amount: Number(invoice.net_amount),
      clinic: {
        name: invoice.clinic.name,
        email: invoice.clinic.email,
        phone: invoice.clinic.phone,
        address: invoice.clinic.address,
        city: invoice.clinic.city,
        state: invoice.clinic.state,
      },
      branch: {
        name: invoice.branch.name,
        phone: invoice.branch.phone,
        address: invoice.branch.address,
        city: invoice.branch.city,
        state: invoice.branch.state,
      },
      patient: {
        first_name: invoice.patient.first_name,
        last_name: invoice.patient.last_name,
        phone: invoice.patient.phone,
        email: invoice.patient.email,
        date_of_birth: invoice.patient.date_of_birth,
        age: invoice.patient.age ?? null,
      },
      dentist: (() => {
        const firstDentist =
          invoice.dentist ??
          invoice.items.map((i) => i.treatment?.dentist).find((d) => d != null);
        if (!firstDentist) return null;
        return {
          name: firstDentist.name,
          specialization: firstDentist.role === 'dentist' ? 'General Dentistry' : firstDentist.role,
          license_number: firstDentist.license_number ?? null,
        };
      })(),
      generated_by: creator
        ? { name: creator.name, signature_image: creatorSignature }
        : null,
      items: invoice.items.map((item) => ({
        item_type: item.item_type,
        description: item.description,
        procedure: item.treatment?.procedure ?? null,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
        tooth_number: item.treatment?.tooth_number ?? null,
      })),
      payments: invoice.payments.map((p) => ({
        amount: Number(p.amount),
        method: p.method,
        paid_at: p.paid_at,
      })),
      refunds: invoice.refunds.map((r) => ({
        amount: Number(r.amount),
        method: r.method,
        refunded_at: r.refunded_at,
        reason: r.reason,
      })),
      currency_code: invoice.clinic.currency_code ?? 'INR',
    };

    const pdfBuffer = await this.invoicePdfService.generate(pdfData);
    await this.s3Service.upload(s3Key, pdfBuffer, 'application/pdf');
    const url = await this.s3Service.getSignedUrl(s3Key);

    return { url };
  }

  async sendWhatsApp(clinicId: string, invoiceId: string): Promise<{ message: string }> {
    const invoice = await this.findOne(clinicId, invoiceId);

    // Don't send drafts or cancelled invoices to patients — they should
    // only ever see the final issued copy.
    if (invoice.lifecycle_status === 'draft') {
      throw new BadRequestException('Cannot send a draft invoice. Issue it first.');
    }
    if (invoice.lifecycle_status === 'cancelled') {
      throw new BadRequestException('Cannot send a cancelled invoice.');
    }

    // Generate / refresh PDF so it's current — capture the signed URL for
    // PDF-header templates (e.g. dental_invoice_pdf).
    const { url: pdfUrl } = await this.getPdfUrl(clinicId, invoiceId);

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

    // Numbered slots for the new PDF template `dental_invoice_pdf`:
    //   {{1}}=patient {{2}}=invoice_no {{3}}=amount {{4}}=clinic {{5}}=phone
    // PLUS named keys so any template whose DB.variables uses semantic names
    // (e.g. legacy `dental_invoice_ready` link-based) also fills correctly.
    const variables: Record<string, string> = {
      // Numbered (PDF template)
      '1': patientName,
      '2': invoice.invoice_number,
      '3': netAmountFormatted,
      '4': clinicName,
      '5': clinicPhone,
      // Named (link-based / custom templates)
      patient_name: patientName,
      patient_first_name: patient.first_name,
      invoice_number: invoice.invoice_number,
      amount: netAmountFormatted,
      clinic_name: clinicName,
      clinic_phone: clinicPhone,
      link: redirectUrl,
    };

    // Attach the invoice PDF as a HEADER:DOCUMENT only for templates whose
    // approved Meta body has a PDF header (we key off `_pdf` suffix).
    const templateName = rule?.template?.template_name || '';
    const isPdfTemplate = /_pdf$/i.test(templateName);
    const headerMedia = isPdfTemplate
      ? {
          type: 'document' as const,
          url: pdfUrl,
          filename: `Invoice-${invoice.invoice_number}.pdf`,
        }
      : undefined;

    await this.communicationService.sendMessage(clinicId, {
      patient_id: invoice.patient_id,
      channel: channel as any,
      category: MessageCategory.TRANSACTIONAL,
      template_id: rule?.template_id ?? undefined,
      body: rule?.template_id
        ? undefined
        : `Hello ${patientName},\n\nYour invoice has been generated.\n\nClinic: ${clinicName}\nInvoice No: ${invoice.invoice_number}\nAmount: ${netAmountFormatted}\n\nView & Download Invoice:\n${redirectUrl}\n\nFor any queries, please reach us at ${clinicPhone} during clinic hours.`,
      variables,
      metadata: {
        automation: 'invoice_ready',
        invoice_id: invoiceId,
        button_url_suffix: redirectUrl,
        ...(headerMedia ? { whatsapp_header_media: headerMedia } : {}),
      },
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

    // Generate PDF so S3 link is fresh — keep the URL for PDF-header templates.
    let pdfUrl: string | null = null;
    try {
      const res = await this.getPdfUrl(clinicId, invoiceId);
      pdfUrl = res.url;
    } catch { /* non-fatal */ }

    const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
    const receiptUrl = `${apiBase}/public/invoice-redirect/${invoiceId}?clinic=${clinicId}`;
    const currCode = clinic?.currency_code ?? 'INR';
    const formattedAmount = `${getCurrencySymbol(currCode)}${amount.toLocaleString(getCurrencyLocale(currCode))}`;
    const clinicName = clinic?.name || 'Your Dental Clinic';
    const clinicPhone = clinic?.phone || '';
    const patientName = `${patient.first_name} ${patient.last_name}`;

    // Numbered slots for the new PDF template `dental_payment_received_pdf`:
    //   {{1}}=patient {{2}}=amount {{3}}=invoice_no {{4}}=clinic {{5}}=phone
    // PLUS named keys for any template using semantic variable names.
    const variables: Record<string, string> = {
      // Numbered (PDF template)
      '1': patientName,
      '2': formattedAmount,
      '3': invoiceNumber,
      '4': clinicName,
      '5': clinicPhone,
      // Named (link-based / custom templates)
      patient_name: patientName,
      patient_first_name: patient.first_name,
      amount: formattedAmount,
      invoice_number: invoiceNumber,
      clinic_name: clinicName,
      clinic_phone: clinicPhone,
      link: receiptUrl,
    };

    // Attach the invoice/receipt PDF only for templates with a PDF header.
    const templateName = rule?.template?.template_name || '';
    const isPdfTemplate = /_pdf$/i.test(templateName);
    const headerMedia = isPdfTemplate && pdfUrl
      ? {
          type: 'document' as const,
          url: pdfUrl,
          filename: `Receipt-${invoiceNumber}.pdf`,
        }
      : undefined;

    await this.communicationService.sendMessage(clinicId, {
      patient_id: patientId,
      channel,
      category: MessageCategory.TRANSACTIONAL,
      template_id: rule?.template_id ?? undefined,
      body: rule?.template_id
        ? undefined
        : `Hi ${patient.first_name},\n\nWe have received your payment of ${formattedAmount} for invoice ${invoiceNumber} at ${clinicName}.\n\nYour receipt is ready. View & download:\n${receiptUrl}\n\nPlease call us ${clinicPhone} for any queries.`,
      variables,
      metadata: {
        automation: 'payment_confirmation',
        invoice_id: invoiceId,
        button_url_suffix: receiptUrl,
        ...(headerMedia ? { whatsapp_header_media: headerMedia } : {}),
      },
    });
  }
}
