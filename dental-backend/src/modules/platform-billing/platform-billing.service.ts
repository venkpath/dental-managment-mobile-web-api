import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { PlatformInvoicePdfService } from './platform-invoice-pdf.service.js';
import {
  PLATFORM_BILLER,
  PLATFORM_GST_RATE,
  isIntraStateBilling,
} from './platform-billing.constants.js';
import type { ListPlatformInvoicesQueryDto } from './dto/list-invoices-query.dto.js';

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

/**
 * Meta-approved WhatsApp template used to deliver platform subscription
 * invoices. The template MUST have:
 *   - HEADER: DOCUMENT (we attach the PDF here)
 *   - BODY with 4 numbered variables: {{1}}=clinic_name {{2}}=invoice_no
 *     {{3}}=amount {{4}}=plan_name
 *
 * Until this template is approved on the platform's WABA, WhatsApp delivery
 * will fail silently (delivery_status falls back to 'partial' / 'failed' on
 * the row, email still goes through).
 */
const WA_INVOICE_TEMPLATE = 'platform_subscription_invoice';
/**
 * Template used when the invoice is unpaid (`due` / `overdue`). MUST be
 * approved on Meta with:
 *   - HEADER: DOCUMENT (PDF attached)
 *   - BODY with 5 vars: {{1}}=clinic_name {{2}}=invoice_no {{3}}=amount
 *     {{4}}=plan_name {{5}}=pay_link_url
 * Falls back to email-only if not yet approved.
 */
const WA_INVOICE_DUE_TEMPLATE = 'platform_subscription_invoice_due';
const WA_INVOICE_LANGUAGE = 'en';

/**
 * Fields returned on clinic-facing invoice endpoints. Internal columns
 * (`notes`, `created_by_user_id`, `is_manual`, delivery breadcrumbs,
 * razorpay refs) are stripped so super-admin operator memos and audit
 * trails don't leak to the customer.
 */
const CLINIC_FACING_INVOICE_SELECT = {
  id: true,
  invoice_number: true,
  plan_id: true,
  plan_name: true,
  billing_cycle: true,
  period_start: true,
  period_end: true,
  subtotal: true,
  tax_rate: true,
  tax_amount: true,
  cgst_amount: true,
  sgst_amount: true,
  igst_amount: true,
  total_amount: true,
  currency: true,
  status: true,
  due_date: true,
  issued_at: true,
  paid_at: true,
  payment_link_url: true,
  pdf_s3_key: true,
  bill_to_name: true,
  bill_to_email: true,
  bill_to_phone: true,
  bill_to_address: true,
  bill_to_city: true,
  bill_to_state: true,
  bill_to_pincode: true,
} as const;

interface CreateInvoiceFromPaymentInput {
  clinicId: string;
  razorpayPaymentId: string;
  razorpaySubscriptionId?: string | null;
  amountInPaise: number; // Razorpay amounts are in paise
  /** Optional period override — falls back to issue date + plan cycle. */
  periodStart?: Date | null;
  periodEnd?: Date | null;
}

export interface CreateManualInvoiceInput {
  clinicId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  /** GST-inclusive total in INR rupees (e.g. 1180 for ₹1,180). */
  totalAmount: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate?: Date | null;
  notes?: string | null;
  /** Super-admin user id that issued this invoice (for audit). */
  createdByUserId?: string | null;
  /** When true, generates a hosted Razorpay Pay Link and delivers via WA+Email. */
  sendImmediately?: boolean;
}

@Injectable()
export class PlatformBillingService implements OnModuleInit {
  private readonly logger = new Logger(PlatformBillingService.name);
  private platformSmtp: nodemailer.Transporter | null = null;
  private razorpay: Razorpay | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly s3: S3Service,
    private readonly pdfService: PlatformInvoicePdfService,
  ) {}

  onModuleInit() {
    const keyId = this.config.get<string>('razorpay.keyId');
    const keySecret = this.config.get<string>('razorpay.keySecret');
    if (keyId && keySecret) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    } else {
      this.logger.warn('Razorpay creds missing — Payment Links disabled, invoices will fall back to email-only delivery');
    }
  }

  // ─── Invoice creation (called from Razorpay webhook) ──────────

  /**
   * Idempotently create a platform invoice for a successful subscription
   * charge. Generates the PDF, uploads it to S3, then attempts WhatsApp +
   * email delivery. Each delivery failure is logged on the invoice row but
   * does not throw — the invoice is the source of truth and re-send is a
   * manual action from the admin UI.
   */
  async createInvoiceFromPayment(input: CreateInvoiceFromPaymentInput): Promise<{ invoiceId: string; isNew: boolean }> {
    // Idempotency: razorpay_payment_id is unique. If we've already issued
    // an invoice for this payment, just return it.
    const existing = await this.prisma.platformInvoice.findUnique({
      where: { razorpay_payment_id: input.razorpayPaymentId },
    });
    if (existing) {
      this.logger.log(`Platform invoice already exists for payment ${input.razorpayPaymentId} (id=${existing.id})`);
      return { invoiceId: existing.id, isNew: false };
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: input.clinicId },
      include: { plan: true },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic ${input.clinicId} not found`);
    }
    if (!clinic.plan) {
      throw new BadRequestException(`Clinic ${input.clinicId} has no plan — cannot issue invoice`);
    }

    // Razorpay charges in paise. Convert to rupees.
    const totalAmount = input.amountInPaise / 100;
    if (totalAmount <= 0) {
      throw new BadRequestException(`Invalid amount ${input.amountInPaise} paise for invoice`);
    }

    // Plan price stored in `Plan.price_monthly` is GST-INCLUSIVE. Reverse-
    // compute subtotal from the actual amount paid (which may differ from
    // the plan price if the subscription is yearly or has a discount).
    const taxRate = PLATFORM_GST_RATE;
    const subtotal = round2(totalAmount / (1 + taxRate / 100));
    const taxAmount = round2(totalAmount - subtotal);

    // CGST+SGST for intra-state (Karnataka), IGST otherwise.
    const intraState = isIntraStateBilling(clinic.state);
    const cgstAmount = intraState ? round2(taxAmount / 2) : 0;
    const sgstAmount = intraState ? round2(taxAmount - cgstAmount) : 0; // absorb rounding
    const igstAmount = intraState ? 0 : taxAmount;

    // Period
    const issuedAt = new Date();
    const billingCycle = clinic.billing_cycle || 'monthly';
    const periodStart = input.periodStart ?? issuedAt;
    const periodEnd = input.periodEnd ?? this.computePeriodEnd(periodStart, billingCycle);

    const invoiceNumber = await this.generateInvoiceNumber(issuedAt);

    const invoice = await this.prisma.platformInvoice.create({
      data: {
        clinic_id: clinic.id,
        invoice_number: invoiceNumber,
        plan_id: clinic.plan_id,
        plan_name: clinic.plan.name,
        billing_cycle: billingCycle,
        period_start: periodStart,
        period_end: periodEnd,

        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: 'INR',
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,

        bill_to_name: clinic.name,
        bill_to_email: clinic.email,
        bill_to_phone: clinic.phone,
        bill_to_address: clinic.address,
        bill_to_city: clinic.city,
        bill_to_state: clinic.state,
        bill_to_pincode: clinic.pincode,

        razorpay_payment_id: input.razorpayPaymentId,
        razorpay_subscription_id: input.razorpaySubscriptionId,

        status: 'paid',
        issued_at: issuedAt,
      },
    });

    this.logger.log(`Platform invoice created: ${invoiceNumber} for clinic ${clinic.id} amount Rs.${totalAmount}`);

    // Generate PDF + upload (best effort — failure here doesn't kill the
    // webhook; we'll regenerate on demand if needed)
    let pdfKey: string | null = null;
    try {
      pdfKey = await this.renderAndUploadPdf(invoice.id);
    } catch (err) {
      this.logger.error(
        `Failed to render/upload PDF for invoice ${invoiceNumber}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    // Best-effort delivery
    if (pdfKey) {
      await this.deliverInvoice(invoice.id).catch((err) =>
        this.logger.warn(
          `Initial delivery failed for invoice ${invoiceNumber}: ${(err as Error).message}`,
        ),
      );
    }

    return { invoiceId: invoice.id, isNew: true };
  }

  // ─── Manual / pre-renewal invoice issuance (invoice-first flow) ──

  /**
   * Issue a platform invoice manually (super-admin) or auto (cron, 3 days
   * before trial end / 1 day before renewal). The invoice is created in
   * `due` state, a Razorpay Payment Link is generated, and WhatsApp + Email
   * are dispatched immediately when `sendImmediately` is true.
   *
   * Idempotency: caller is responsible for not double-issuing per clinic +
   * period; the cron uses a `(clinic_id, period_start, period_end, status)`
   * check before calling.
   */
  async createManualInvoice(input: CreateManualInvoiceInput): Promise<{ invoiceId: string; payLinkUrl: string | null }> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new NotFoundException(`Clinic ${input.clinicId} not found`);

    const plan = await this.prisma.plan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new NotFoundException(`Plan ${input.planId} not found`);

    if (!(input.totalAmount > 0)) {
      throw new BadRequestException('Invoice amount must be > 0');
    }
    if (input.periodEnd <= input.periodStart) {
      throw new BadRequestException('Period end must be after period start');
    }

    // GST split (same convention as charge-time invoices — total is GST-inclusive)
    const taxRate = PLATFORM_GST_RATE;
    const subtotal = round2(input.totalAmount / (1 + taxRate / 100));
    const taxAmount = round2(input.totalAmount - subtotal);
    const intraState = isIntraStateBilling(clinic.state);
    const cgstAmount = intraState ? round2(taxAmount / 2) : 0;
    const sgstAmount = intraState ? round2(taxAmount - cgstAmount) : 0;
    const igstAmount = intraState ? 0 : taxAmount;

    const issuedAt = new Date();
    const dueDate = input.dueDate ?? this.computeDefaultDueDate(input.periodStart);
    const invoiceNumber = await this.generateInvoiceNumber(issuedAt);

    const invoice = await this.prisma.platformInvoice.create({
      data: {
        clinic_id: clinic.id,
        invoice_number: invoiceNumber,
        plan_id: plan.id,
        plan_name: plan.name,
        billing_cycle: input.billingCycle,
        period_start: input.periodStart,
        period_end: input.periodEnd,

        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: input.totalAmount,
        currency: 'INR',
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,

        bill_to_name: clinic.name,
        bill_to_email: clinic.email,
        bill_to_phone: clinic.phone,
        bill_to_address: clinic.address,
        bill_to_city: clinic.city,
        bill_to_state: clinic.state,
        bill_to_pincode: clinic.pincode,

        status: 'due',
        due_date: dueDate,
        issued_at: issuedAt,
        is_manual: !!input.createdByUserId,
        created_by_user_id: input.createdByUserId ?? null,
        notes: input.notes ?? null,
      },
    });

    this.logger.log(`Manual invoice ${invoiceNumber} issued for clinic ${clinic.id} (${input.totalAmount} INR, due ${dueDate.toISOString()})`);

    // Generate Razorpay Payment Link (best effort)
    let payLinkUrl: string | null = null;
    try {
      const link = await this.createPaymentLink(invoice.id);
      payLinkUrl = link.short_url;
    } catch (err) {
      this.logger.error(
        `Failed to create Payment Link for ${invoiceNumber}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    // Render PDF + upload (best effort)
    try {
      await this.renderAndUploadPdf(invoice.id);
    } catch (err) {
      this.logger.error(`Failed to render PDF for ${invoiceNumber}: ${(err as Error).message}`);
    }

    if (input.sendImmediately !== false) {
      await this.deliverInvoice(invoice.id).catch((err) =>
        this.logger.warn(`Initial delivery failed for ${invoiceNumber}: ${(err as Error).message}`),
      );
    }

    return { invoiceId: invoice.id, payLinkUrl };
  }

  /**
   * Create (or recreate) a Razorpay Payment Link for a due invoice. The
   * link expires at the invoice's due_date + 14 days so the customer has
   * a fair window past due_date to still pay before we issue a new one.
   */
  async createPaymentLink(invoiceId: string) {
    if (!this.razorpay) {
      throw new BadRequestException('Razorpay not configured — cannot generate payment link');
    }
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.status === 'refunded') {
      throw new BadRequestException(`Cannot generate Pay link for ${invoice.status} invoice`);
    }

    const totalRupees = Number(invoice.total_amount);
    const amountInPaise = Math.round(totalRupees * 100);

    // Give the customer ≥14 days from NOW (and ≥14 days past due_date for
    // not-yet-due invoices) so a refresh on a long-overdue invoice doesn't
    // hand back a near-expired link.
    const nowPlus14 = Date.now() + 14 * 86_400_000;
    const duePlus14 = invoice.due_date ? invoice.due_date.getTime() + 14 * 86_400_000 : nowPlus14;
    const expireBy = Math.floor(Math.max(nowPlus14, duePlus14) / 1000);
    // Razorpay requires expire_by >= now + 15 minutes (we keep 16-min safety)
    const minExpire = Math.floor((Date.now() + 16 * 60 * 1000) / 1000);
    const safeExpireBy = Math.max(expireBy, minExpire);

    const description = `${invoice.plan_name} — ${this.formatDateRange(invoice.period_start, invoice.period_end)}`;

    const link = await this.razorpay.paymentLink.create({
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      expire_by: safeExpireBy,
      reference_id: invoice.invoice_number,
      description: description.slice(0, 2048),
      customer: {
        name: invoice.bill_to_name,
        email: invoice.bill_to_email,
        contact: invoice.bill_to_phone ?? undefined,
      },
      // We send our own WA + Email; tell Razorpay not to double-send.
      notify: { email: false, sms: false },
      reminder_enable: true,
      notes: {
        platform_invoice_id: invoice.id,
        clinic_id: invoice.clinic_id,
        invoice_number: invoice.invoice_number,
      },
      callback_url: this.buildPaymentCallbackUrl(invoice.id),
      callback_method: 'get',
    });

    await this.prisma.platformInvoice.update({
      where: { id: invoice.id },
      data: {
        razorpay_payment_link_id: link.id,
        payment_link_url: link.short_url,
      },
    });

    return link;
  }

  /**
   * Mark an invoice paid. Called by the Razorpay `payment_link.paid` webhook
   * and by the super-admin "record offline payment" action. Idempotent —
   * second call is a no-op. Also activates the owning clinic and rolls
   * `next_billing_at` forward to the invoice period_end so feature gates
   * lift immediately regardless of payment channel (online or offline).
   */
  async markInvoicePaid(
    invoiceId: string,
    opts: { razorpayPaymentId?: string | null; paidAt?: Date | null; appendNote?: string | null } = {},
  ) {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') return invoice;

    const updated = await this.prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paid_at: opts.paidAt ?? new Date(),
        razorpay_payment_id: opts.razorpayPaymentId ?? invoice.razorpay_payment_id,
        notes: opts.appendNote
          ? `${invoice.notes ? invoice.notes + '\n' : ''}${opts.appendNote}`
          : invoice.notes,
      },
    });

    await this.prisma.clinic.update({
      where: { id: invoice.clinic_id },
      data: {
        subscription_status: 'active',
        next_billing_at: invoice.period_end,
      },
    }).catch((err) =>
      this.logger.warn(
        `Failed to activate clinic ${invoice.clinic_id} after invoice ${invoice.invoice_number} paid: ${(err as Error).message}`,
      ),
    );

    this.logger.log(`Invoice ${invoice.invoice_number} marked paid (payment_id=${opts.razorpayPaymentId ?? 'n/a'})`);
    return updated;
  }

  /**
   * Cancel a draft/due invoice. Once cancelled, the Pay link is voided on
   * Razorpay (best effort) so the customer can't accidentally pay a voided
   * invoice. Paid invoices cannot be cancelled — use a refund instead.
   */
  async cancelInvoice(invoiceId: string, opts: { reason?: string | null } = {}) {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid' || invoice.status === 'refunded') {
      throw new BadRequestException(`Cannot cancel a ${invoice.status} invoice`);
    }
    if (invoice.razorpay_payment_link_id && this.razorpay) {
      await (this.razorpay.paymentLink as unknown as { cancel: (id: string) => Promise<unknown> })
        .cancel(invoice.razorpay_payment_link_id)
        .catch((err: Error) =>
          this.logger.warn(`Razorpay paymentLink.cancel failed for ${invoice.invoice_number}: ${err.message}`),
        );
    }
    return this.prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'cancelled',
        notes: opts.reason ? `${invoice.notes ? invoice.notes + '\n' : ''}Cancelled: ${opts.reason}` : invoice.notes,
      },
    });
  }

  /** Customer-side: returns the Pay link URL for a due/overdue invoice. Refreshes the link if expired. */
  async getPaymentLinkForClinic(clinicId: string, invoiceId: string): Promise<{ url: string; expires_at: string | null }> {
    const invoice = await this.getInvoice(clinicId, invoiceId);
    if (invoice.status !== 'due' && invoice.status !== 'overdue') {
      throw new BadRequestException(`Invoice is ${invoice.status} — nothing to pay`);
    }
    // If the link is missing or expired, regenerate.
    if (!invoice.payment_link_url) {
      const link = await this.createPaymentLink(invoice.id);
      return { url: link.short_url, expires_at: link.expire_by ? new Date(Number(link.expire_by) * 1000).toISOString() : null };
    }
    return { url: invoice.payment_link_url, expires_at: null };
  }

  /** Customer-side: list invoices that are not yet paid (due | overdue). */
  async listOutstandingInvoices(clinicId: string) {
    return this.prisma.platformInvoice.findMany({
      where: { clinic_id: clinicId, status: { in: ['due', 'overdue'] } },
      orderBy: { due_date: 'asc' },
      select: CLINIC_FACING_INVOICE_SELECT,
    });
  }

  // ─── Cron: pre-renewal & pre-trial invoice generation ──────────

  /**
   * Daily at 02:00 IST: for every clinic whose trial ends in 3 days OR whose
   * renewal is in 1 day, generate a due invoice with a Pay link if one
   * doesn't already exist for that period. Industry standard (Stripe,
   * Chargebee, Zoho) is to issue the invoice a few days before so the
   * customer has visibility + a one-tap Pay surface.
   */
  @Cron('0 0 2 * * *', { timeZone: 'Asia/Kolkata' })
  async generateUpcomingInvoices(): Promise<void> {
    this.logger.log('Running platform-invoice pre-billing cron');
    try {
      await Promise.all([
        this.generateTrialEndInvoices(),
        this.generateRenewalInvoices(),
        this.markOverdueInvoices(),
      ]);
    } catch (err) {
      this.logger.error(`Pre-billing cron failed: ${(err as Error).message}`, (err as Error).stack);
    }
  }

  private async generateTrialEndInvoices(): Promise<void> {
    const now = new Date();
    // Trials ending 2-4 days from now (3-day target ± 1 day grace for cron drift)
    const windowStart = new Date(now.getTime() + 2 * 86_400_000);
    const windowEnd = new Date(now.getTime() + 4 * 86_400_000);

    const clinics = await this.prisma.clinic.findMany({
      where: {
        subscription_status: 'trial',
        is_complimentary: false,
        trial_ends_at: { gte: windowStart, lte: windowEnd },
        plan_id: { not: null },
      },
      include: { plan: true },
    });

    for (const clinic of clinics) {
      if (!clinic.plan || !clinic.trial_ends_at) continue;
      const periodStart = clinic.trial_ends_at;
      const periodEnd = this.computePeriodEnd(periodStart, clinic.billing_cycle || 'monthly');

      const existing = await this.prisma.platformInvoice.findFirst({
        where: {
          clinic_id: clinic.id,
          period_start: periodStart,
          status: { in: ['due', 'overdue', 'paid'] },
        },
      });
      if (existing) continue;

      const price = clinic.billing_cycle === 'yearly'
        ? Number(clinic.plan.price_yearly ?? clinic.plan.price_monthly) * 12
        : Number(clinic.plan.price_monthly);

      await this.createManualInvoice({
        clinicId: clinic.id,
        planId: clinic.plan.id,
        billingCycle: (clinic.billing_cycle as 'monthly' | 'yearly') || 'monthly',
        totalAmount: price,
        periodStart,
        periodEnd,
        dueDate: clinic.trial_ends_at,
        notes: 'Auto-generated 3 days before trial end',
        sendImmediately: true,
      }).catch((err) =>
        this.logger.warn(`Trial-end invoice failed for clinic ${clinic.id}: ${(err as Error).message}`),
      );
    }
  }

  private async generateRenewalInvoices(): Promise<void> {
    const now = new Date();
    // Renewals within 1-2 days (1-day target ± 1 day grace)
    const windowStart = new Date(now.getTime());
    const windowEnd = new Date(now.getTime() + 2 * 86_400_000);

    const clinics = await this.prisma.clinic.findMany({
      where: {
        subscription_status: 'active',
        is_complimentary: false,
        next_billing_at: { gte: windowStart, lte: windowEnd },
        plan_id: { not: null },
      },
      include: { plan: true },
    });

    for (const clinic of clinics) {
      if (!clinic.plan || !clinic.next_billing_at) continue;
      const periodStart = clinic.next_billing_at;
      const periodEnd = this.computePeriodEnd(periodStart, clinic.billing_cycle || 'monthly');

      const existing = await this.prisma.platformInvoice.findFirst({
        where: {
          clinic_id: clinic.id,
          period_start: periodStart,
          status: { in: ['due', 'overdue', 'paid'] },
        },
      });
      if (existing) continue;

      const price = clinic.billing_cycle === 'yearly'
        ? Number(clinic.plan.price_yearly ?? clinic.plan.price_monthly) * 12
        : Number(clinic.plan.price_monthly);

      await this.createManualInvoice({
        clinicId: clinic.id,
        planId: clinic.plan.id,
        billingCycle: (clinic.billing_cycle as 'monthly' | 'yearly') || 'monthly',
        totalAmount: price,
        periodStart,
        periodEnd,
        dueDate: clinic.next_billing_at,
        notes: 'Auto-generated 1 day before renewal',
        sendImmediately: true,
      }).catch((err) =>
        this.logger.warn(`Renewal invoice failed for clinic ${clinic.id}: ${(err as Error).message}`),
      );
    }
  }

  /** Flip due → overdue once past due_date so the UI can highlight unpaid invoices. */
  private async markOverdueInvoices(): Promise<void> {
    const now = new Date();
    const res = await this.prisma.platformInvoice.updateMany({
      where: { status: 'due', due_date: { lt: now } },
      data: { status: 'overdue' },
    });
    if (res.count > 0) this.logger.log(`Marked ${res.count} invoice(s) overdue`);
  }

  // ─── Listing / retrieval ──────────────────────────────────────

  async listInvoicesForClinic(clinicId: string, query: ListPlatformInvoicesQueryDto) {
    const where: Record<string, unknown> = { clinic_id: clinicId };
    if (query.status) where['status'] = query.status;

    const [items, total] = await Promise.all([
      this.prisma.platformInvoice.findMany({
        where,
        orderBy: { issued_at: 'desc' },
        take: query.limit ?? 20,
        skip: query.offset ?? 0,
        select: CLINIC_FACING_INVOICE_SELECT,
      }),
      this.prisma.platformInvoice.count({ where }),
    ]);
    return { items, total };
  }

  async getInvoice(clinicId: string, invoiceId: string) {
    const invoice = await this.prisma.platformInvoice.findUnique({
      where: { id: invoiceId },
      select: { ...CLINIC_FACING_INVOICE_SELECT, clinic_id: true },
    });
    if (!invoice || invoice.clinic_id !== clinicId) {
      throw new NotFoundException('Platform invoice not found');
    }
    return invoice;
  }

  // ─── Super-admin views (cross-clinic) ─────────────────────────

  /**
   * List platform invoices across all clinics — used by the super-admin
   * back-office page. Supports filtering by clinic, status, and date range.
   */
  async listAllInvoicesForSuperAdmin(query: {
    status?: string;
    clinicId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (query.status) where['status'] = query.status;
    if (query.clinicId) where['clinic_id'] = query.clinicId;
    if (query.fromDate || query.toDate) {
      const range: Record<string, Date> = {};
      if (query.fromDate) range['gte'] = new Date(query.fromDate);
      if (query.toDate) range['lte'] = new Date(query.toDate);
      where['issued_at'] = range;
    }
    if (query.search) {
      where['OR'] = [
        { invoice_number: { contains: query.search, mode: 'insensitive' } },
        { bill_to_name: { contains: query.search, mode: 'insensitive' } },
        { bill_to_email: { contains: query.search, mode: 'insensitive' } },
        { razorpay_payment_id: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total, totals] = await Promise.all([
      this.prisma.platformInvoice.findMany({
        where,
        orderBy: { issued_at: 'desc' },
        take: query.limit ?? 25,
        skip: query.offset ?? 0,
        include: {
          clinic: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.platformInvoice.count({ where }),
      this.prisma.platformInvoice.aggregate({
        where,
        _sum: { total_amount: true, tax_amount: true },
      }),
    ]);

    return {
      items,
      total,
      totals: {
        total_amount_inr: Number(totals._sum?.total_amount ?? 0),
        tax_amount_inr: Number(totals._sum?.tax_amount ?? 0),
      },
    };
  }

  /** Super-admin: fetch a single invoice without the clinic-scope check. */
  async getInvoiceForSuperAdmin(invoiceId: string) {
    const invoice = await this.prisma.platformInvoice.findUnique({
      where: { id: invoiceId },
      include: { clinic: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!invoice) throw new NotFoundException('Platform invoice not found');
    return invoice;
  }

  /** Super-admin: get a fresh signed PDF URL for any clinic's invoice. */
  async getInvoicePdfUrlForSuperAdmin(invoiceId: string): Promise<{ url: string; filename: string }> {
    const invoice = await this.getInvoiceForSuperAdmin(invoiceId);
    let key = invoice.pdf_s3_key;
    if (!key) {
      key = await this.renderAndUploadPdf(invoice.id);
    }
    const url = await this.s3.getSignedUrl(key);
    return { url, filename: `${invoice.invoice_number}.pdf` };
  }

  /** Super-admin: resend the invoice via WhatsApp + Email regardless of clinic. */
  async resendInvoiceForSuperAdmin(invoiceId: string) {
    const invoice = await this.getInvoiceForSuperAdmin(invoiceId);
    if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
      throw new BadRequestException(`Cannot resend a ${invoice.status} invoice`);
    }
    if (!invoice.pdf_s3_key) {
      await this.renderAndUploadPdf(invoice.id);
    }
    // For unpaid invoices, refresh the Pay link if missing.
    if ((invoice.status === 'due' || invoice.status === 'overdue') && !invoice.payment_link_url) {
      await this.createPaymentLink(invoice.id).catch((err) =>
        this.logger.warn(`Pay link refresh failed during resend for ${invoice.invoice_number}: ${(err as Error).message}`),
      );
    }
    return this.deliverInvoice(invoice.id);
  }

  /** Returns a freshly signed S3 URL for the invoice PDF, regenerating + uploading if missing. */
  async getInvoicePdfUrl(clinicId: string, invoiceId: string): Promise<{ url: string; filename: string }> {
    const invoice = await this.getInvoice(clinicId, invoiceId);

    let key = invoice.pdf_s3_key;
    if (!key) {
      key = await this.renderAndUploadPdf(invoice.id);
    }
    const url = await this.s3.getSignedUrl(key);
    const filename = `${invoice.invoice_number}.pdf`;
    return { url, filename };
  }

  // ─── Manual re-send (admin UI) ────────────────────────────────

  async resendInvoice(clinicId: string, invoiceId: string) {
    const invoice = await this.getInvoice(clinicId, invoiceId);
    if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
      throw new BadRequestException(`Cannot resend a ${invoice.status} invoice`);
    }
    if (!invoice.pdf_s3_key) {
      await this.renderAndUploadPdf(invoice.id);
    }
    if ((invoice.status === 'due' || invoice.status === 'overdue') && !invoice.payment_link_url) {
      await this.createPaymentLink(invoice.id).catch((err) =>
        this.logger.warn(`Pay link refresh failed for ${invoice.invoice_number}: ${(err as Error).message}`),
      );
    }
    return this.deliverInvoice(invoice.id);
  }

  // ─── Delivery ─────────────────────────────────────────────────

  private async deliverInvoice(invoiceId: string): Promise<{ whatsapp: boolean; email: boolean }> {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const [emailOk, whatsappOk] = await Promise.all([
      this.sendEmail(invoice.id).catch((err) => {
        this.logger.warn(`Email delivery failed for invoice ${invoice.invoice_number}: ${(err as Error).message}`);
        return false;
      }),
      this.sendWhatsApp(invoice.id).catch((err) => {
        this.logger.warn(`WhatsApp delivery failed for invoice ${invoice.invoice_number}: ${(err as Error).message}`);
        return false;
      }),
    ]);

    const deliveryStatus =
      emailOk && whatsappOk ? 'sent' :
      emailOk || whatsappOk ? 'partial' :
      'failed';

    await this.prisma.platformInvoice.update({
      where: { id: invoice.id },
      data: { delivery_status: deliveryStatus },
    });

    return { whatsapp: whatsappOk, email: emailOk };
  }

  private async sendEmail(invoiceId: string): Promise<boolean> {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return false;
    if (!invoice.bill_to_email) {
      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { email_error: 'No bill-to email on clinic' },
      });
      return false;
    }

    const transporter = this.getPlatformSmtp();
    if (!transporter) {
      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { email_error: 'Platform SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)' },
      });
      return false;
    }

    const pdfBuffer = await this.fetchPdfBuffer(invoice.id);
    if (!pdfBuffer) {
      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { email_error: 'PDF not available' },
      });
      return false;
    }

    const html = this.buildEmailHtml(invoice);
    const text = this.buildEmailText(invoice);
    const from = this.config.get<string>('app.smtp.from') || `${PLATFORM_BILLER.brandName} <${PLATFORM_BILLER.email}>`;

    try {
      await transporter.sendMail({
        from,
        to: invoice.bill_to_email,
        subject: `${PLATFORM_BILLER.brandName} — Invoice ${invoice.invoice_number}`,
        text,
        html,
        attachments: [
          {
            filename: `${invoice.invoice_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { email_sent_at: new Date(), email_error: null },
      });
      this.logger.log(`Invoice ${invoice.invoice_number} emailed to ${invoice.bill_to_email}`);
      return true;
    } catch (err) {
      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { email_error: (err as Error).message },
      });
      throw err;
    }
  }

  /**
   * Send the invoice via the platform's own WhatsApp Business number using a
   * Meta-approved utility template with a PDF header. If the template isn't
   * yet approved on Meta, this surfaces the API error onto the invoice row
   * so the admin can re-send after approval.
   */
  private async sendWhatsApp(invoiceId: string): Promise<boolean> {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return false;
    if (!invoice.bill_to_phone) {
      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { whatsapp_error: 'No bill-to phone on clinic' },
      });
      return false;
    }

    const accessToken = this.config.get<string>('app.whatsapp.accessToken');
    const phoneNumberId = this.config.get<string>('app.whatsapp.phoneNumberId');
    if (!accessToken || !phoneNumberId) {
      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { whatsapp_error: 'Platform WhatsApp not configured' },
      });
      return false;
    }

    // The PDF must be reachable by Meta over the public internet — we send a
    // signed S3 URL. (Meta downloads + caches it before delivery.)
    const pdfUrl = await this.getInvoicePdfUrl(invoice.clinic_id, invoice.id);

    const destination = normalizeIndianPhone(invoice.bill_to_phone);
    const totalFormatted = `Rs. ${Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const unpaid = invoice.status === 'due' || invoice.status === 'overdue';
    const templateName = unpaid ? WA_INVOICE_DUE_TEMPLATE : WA_INVOICE_TEMPLATE;
    const bodyParams: Array<{ type: 'text'; text: string }> = [
      { type: 'text', text: invoice.bill_to_name },
      { type: 'text', text: invoice.invoice_number },
      { type: 'text', text: totalFormatted },
      { type: 'text', text: invoice.plan_name },
    ];
    if (unpaid && invoice.payment_link_url) {
      bodyParams.push({ type: 'text', text: invoice.payment_link_url });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: destination,
      type: 'template',
      template: {
        name: templateName,
        language: { code: WA_INVOICE_LANGUAGE },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: {
                  link: pdfUrl.url,
                  filename: `${invoice.invoice_number}.pdf`,
                },
              },
            ],
          },
          {
            type: 'body',
            parameters: bodyParams,
          },
        ],
      },
    };

    try {
      const res = await fetch(`${META_GRAPH_API}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok || !data['messages']) {
        const error = data['error'] as Record<string, unknown> | undefined;
        const errMsg = (error?.['message'] as string) || `HTTP ${res.status}`;
        await this.prisma.platformInvoice.update({
          where: { id: invoiceId },
          data: { whatsapp_error: errMsg },
        });
        this.logger.warn(`WhatsApp invoice send failed for ${invoice.invoice_number}: ${errMsg}`);
        return false;
      }

      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { whatsapp_sent_at: new Date(), whatsapp_error: null },
      });

      // Also log to platform_messages for the super-admin WA inbox
      const messages = data['messages'] as Array<{ id: string }>;
      await this.prisma.platformMessage
        .create({
          data: {
            direction: 'outbound',
            channel: 'whatsapp',
            from_phone: phoneNumberId,
            to_phone: destination,
            contact_phone: destination,
            contact_name: invoice.bill_to_name,
            body: `Invoice ${invoice.invoice_number} — ${totalFormatted}`,
            message_type: 'document',
            status: 'sent',
            wa_message_id: messages[0]?.id || null,
            template_name: templateName,
            sent_at: new Date(),
            metadata: { platform_invoice_id: invoiceId },
          },
        })
        .catch(() => undefined);

      this.logger.log(`Invoice ${invoice.invoice_number} sent via WhatsApp to ${destination}`);
      return true;
    } catch (err) {
      await this.prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: { whatsapp_error: (err as Error).message },
      });
      throw err;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async generateInvoiceNumber(issuedAt: Date): Promise<string> {
    // Format: SDD-YYYYMM-NNNN — sequential per calendar month, globally
    // (not per clinic) so the supplier-side accounting stays clean.
    const yyyymm = `${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `SDD-${yyyymm}`;

    const last = await this.prisma.platformInvoice.findFirst({
      where: { invoice_number: { startsWith: prefix } },
      orderBy: { invoice_number: 'desc' },
      select: { invoice_number: true },
    });

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.invoice_number.split('-').pop() || '0', 10);
      if (Number.isFinite(lastSeq)) seq = lastSeq + 1;
    }
    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }

  private computePeriodEnd(start: Date, cycle: string): Date {
    const end = new Date(start);
    if (cycle === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    end.setDate(end.getDate() - 1); // inclusive end day
    return end;
  }

  /** Default due date for manually-issued invoices = +7 days from period start, capped at period start. */
  private computeDefaultDueDate(periodStart: Date): Date {
    const dd = new Date(periodStart);
    dd.setDate(dd.getDate() + 7);
    return dd < periodStart ? periodStart : dd;
  }

  private formatDateRange(start: Date, end: Date): string {
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmt(start)} to ${fmt(end)}`;
  }

  /** Where Razorpay redirects after a successful Pay-link payment. */
  private buildPaymentCallbackUrl(invoiceId: string): string {
    const base = this.config.get<string>('app.frontendUrl') || this.config.get<string>('app.url') || 'https://app.smartdentaldesk.com';
    return `${base.replace(/\/$/, '')}/billing/invoices/${invoiceId}?payment=success`;
  }

  private async renderAndUploadPdf(invoiceId: string): Promise<string> {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const buffer = await this.pdfService.generate({
      invoice_number: invoice.invoice_number,
      issued_at: invoice.issued_at,
      status: invoice.status,
      plan_name: invoice.plan_name,
      billing_cycle: invoice.billing_cycle,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      subtotal: Number(invoice.subtotal),
      tax_rate: Number(invoice.tax_rate),
      tax_amount: Number(invoice.tax_amount),
      total_amount: Number(invoice.total_amount),
      cgst_amount: Number(invoice.cgst_amount),
      sgst_amount: Number(invoice.sgst_amount),
      igst_amount: Number(invoice.igst_amount),
      currency: invoice.currency,
      bill_to: {
        name: invoice.bill_to_name,
        email: invoice.bill_to_email,
        phone: invoice.bill_to_phone,
        address: invoice.bill_to_address,
        city: invoice.bill_to_city,
        state: invoice.bill_to_state,
        pincode: invoice.bill_to_pincode,
        gstin: invoice.bill_to_gstin,
      },
      razorpay_payment_id: invoice.razorpay_payment_id,
    });

    const key = `platform-invoices/${invoice.clinic_id}/${invoice.invoice_number}.pdf`;
    await this.s3.upload(key, buffer, 'application/pdf');

    await this.prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: { pdf_s3_key: key },
    });

    return key;
  }

  private async fetchPdfBuffer(invoiceId: string): Promise<Buffer | null> {
    const invoice = await this.prisma.platformInvoice.findUnique({
      where: { id: invoiceId },
      select: { pdf_s3_key: true },
    });
    if (!invoice?.pdf_s3_key) return null;
    return this.s3.getObject(invoice.pdf_s3_key);
  }

  /**
   * Lazy-init nodemailer transporter using the platform SMTP env config
   * (NOT the per-clinic email provider — those are clinic-to-patient).
   */
  private getPlatformSmtp(): nodemailer.Transporter | null {
    if (this.platformSmtp) return this.platformSmtp;

    const host = this.config.get<string>('app.smtp.host');
    const user = this.config.get<string>('app.smtp.user');
    const pass = this.config.get<string>('app.smtp.pass');
    const port = this.config.get<number>('app.smtp.port') || 587;
    const secure = this.config.get<boolean>('app.smtp.secure') ?? port === 465;

    if (!host || !user || !pass) return null;

    this.platformSmtp = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 60_000,
      ...(!secure && { tls: { rejectUnauthorized: false } }),
    });
    return this.platformSmtp;
  }

  private buildEmailText(invoice: {
    bill_to_name: string; invoice_number: string; total_amount: unknown; plan_name: string;
    billing_cycle: string; period_start: Date; period_end: Date; status: string;
    due_date?: Date | null; payment_link_url?: string | null;
  }): string {
    const total = Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const unpaid = invoice.status === 'due' || invoice.status === 'overdue';
    const lead = unpaid
      ? `Your subscription invoice from ${PLATFORM_BILLER.brandName} is ready.`
      : `Thank you for your subscription payment to ${PLATFORM_BILLER.brandName}.`;
    const lines = [
      `Hello ${invoice.bill_to_name},`,
      ``,
      lead,
      ``,
      `Invoice Number: ${invoice.invoice_number}`,
      `Plan:           ${invoice.plan_name} (${invoice.billing_cycle})`,
      `Period:         ${invoice.period_start.toLocaleDateString('en-IN')} to ${invoice.period_end.toLocaleDateString('en-IN')}`,
      `${unpaid ? 'Amount Due' : 'Total Paid'}:     Rs. ${total} (incl. GST ${PLATFORM_GST_RATE}%)`,
    ];
    if (unpaid && invoice.due_date) {
      lines.push(`Due Date:       ${invoice.due_date.toLocaleDateString('en-IN')}`);
    }
    lines.push('', `Your tax invoice is attached as a PDF.`);
    if (unpaid && invoice.payment_link_url) {
      lines.push('', `Pay securely online: ${invoice.payment_link_url}`);
    }
    lines.push(
      '',
      `For billing queries, reply to this email or contact ${PLATFORM_BILLER.phone}.`,
      '',
      `Best regards,`,
      `${PLATFORM_BILLER.brandName}`,
      `by ${PLATFORM_BILLER.legalName}`,
      `GSTIN: ${PLATFORM_BILLER.gstin}`,
      `${PLATFORM_BILLER.addressOneLine}`,
    );
    return lines.join('\n');
  }

  private buildEmailHtml(invoice: {
    bill_to_name: string; invoice_number: string; total_amount: unknown; plan_name: string;
    billing_cycle: string; period_start: Date; period_end: Date; status: string;
    due_date?: Date | null; payment_link_url?: string | null;
  }): string {
    const total = Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const period = `${invoice.period_start.toLocaleDateString('en-IN')} to ${invoice.period_end.toLocaleDateString('en-IN')}`;
    const unpaid = invoice.status === 'due' || invoice.status === 'overdue';
    const overdue = invoice.status === 'overdue';
    const amountLabel = unpaid ? 'Amount Due' : 'Total Paid';
    const headerCopy = unpaid
      ? 'Your subscription invoice is ready. Pay securely with the button below to keep your clinic running without interruption.'
      : 'Thank you for your subscription payment. Your tax invoice is attached as a PDF for your records.';
    const dueRow = unpaid && invoice.due_date
      ? `<tr><td style="color:#6b7280;">Due Date</td><td><strong>${escapeHtml(invoice.due_date.toLocaleDateString('en-IN'))}</strong>${overdue ? ' <span style="color:#dc2626;">(overdue)</span>' : ''}</td></tr>`
      : '';
    const payButton = unpaid && invoice.payment_link_url
      ? `<p style="margin:20px 0 0 0;text-align:center;">
           <a href="${escapeHtml(invoice.payment_link_url)}"
              style="display:inline-block;background:#0d6efd;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">
             Pay ₹${total} Now
           </a>
         </p>
         <p style="margin:8px 0 0 0;text-align:center;font-size:11px;color:#9ca3af;">Secured by Razorpay · UPI / Cards / Net banking</p>`
      : '';
    return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:24px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#0d6efd;padding:20px 24px;color:#ffffff;">
              <div style="font-size:20px;font-weight:bold;">${PLATFORM_BILLER.brandName}</div>
              <div style="font-size:12px;opacity:0.85;">by ${PLATFORM_BILLER.legalName}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px 0;">Hello <strong>${escapeHtml(invoice.bill_to_name)}</strong>,</p>
              <p style="margin:0 0 16px 0;">${headerCopy}</p>
              <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;width:100%;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;">
                <tr><td style="color:#6b7280;width:40%;">Invoice Number</td><td><strong>${escapeHtml(invoice.invoice_number)}</strong></td></tr>
                <tr><td style="color:#6b7280;">Plan</td><td>${escapeHtml(invoice.plan_name)} (${escapeHtml(invoice.billing_cycle)})</td></tr>
                <tr><td style="color:#6b7280;">Period</td><td>${escapeHtml(period)}</td></tr>
                <tr><td style="color:#6b7280;">${amountLabel}</td><td><strong>Rs. ${total}</strong> <span style="color:#6b7280;font-size:12px;">incl. GST ${PLATFORM_GST_RATE}%</span></td></tr>
                ${dueRow}
              </table>
              ${payButton}
              <p style="margin:18px 0 0 0;font-size:13px;color:#6b7280;">For billing queries, reply to this email or call ${escapeHtml(PLATFORM_BILLER.phone)}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
              ${escapeHtml(PLATFORM_BILLER.legalName)} · GSTIN: ${escapeHtml(PLATFORM_BILLER.gstin)}<br/>
              ${escapeHtml(PLATFORM_BILLER.addressOneLine)}
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }
}

// ─── Module-private utility helpers ───────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeIndianPhone(raw: string): string {
  let phone = raw.replace(/[^0-9]/g, '');
  if (phone.length === 10) phone = '91' + phone;
  else if (phone.length === 11 && phone.startsWith('0')) phone = '91' + phone.slice(1);
  return phone;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
