import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import {
  WHATSAPP_OVERAGE_PRICE_INR,
  priceForCategory,
  type WhatsAppCategory,
} from '../communication/whatsapp-pricing.constants.js';
import { PlatformBillingService } from './platform-billing.service.js';

export interface OverageBreakdown {
  utility: { sent: number; billable: number; unit_price: number; amount: number };
  marketing: { sent: number; billable: number; unit_price: number; amount: number };
  authentication: { sent: number; billable: number; unit_price: number; amount: number };
  total_sent: number;
  total_billable: number;
  total_amount: number;
  included_quota: number;
}

interface OverageLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  category: 'WHATSAPP_UTILITY_OVERAGE' | 'WHATSAPP_MARKETING_OVERAGE' | 'WHATSAPP_AUTHENTICATION_OVERAGE';
}

/**
 * Computes & bills WhatsApp message overage charges.
 *
 * Each plan includes a base WhatsApp quota (`Plan.whatsapp_included_monthly`).
 * Sends beyond that quota are billed at per-Meta-category rates:
 *
 *   UTILITY        ₹0.40 / msg
 *   MARKETING      ₹1.00 / msg
 *   AUTHENTICATION ₹0.30 / msg
 *
 * Only clinics on a plan with `allow_whatsapp_overage_billing = true` are
 * billed. Free clinics (overage disabled) just hit the hard limit and are
 * blocked at send time.
 *
 * Overage allocation strategy (pro-rata):
 *   1. Compute total_sent across the three categories
 *   2. overage_total = max(0, total_sent - included)
 *   3. Each category's billable share = (category_sent / total_sent) * overage_total
 *      with the AUTH bucket absorbing rounding remainders.
 *   This avoids prioritising any one category and matches what a customer would
 *   intuitively expect ("you went 100 messages over, here's the cost-weighted bill").
 */
@Injectable()
export class WhatsAppOverageService {
  private readonly logger = new Logger(WhatsAppOverageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformBilling: PlatformBillingService,
  ) {}

  /**
   * Compute the overage breakdown for a single clinic for the given billing
   * period. Returns zero-billable amounts when the clinic is under quota.
   */
  async computeForPeriod(clinicId: string, periodStart: Date): Promise<OverageBreakdown> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        has_own_waba: true,
        custom_waba_monthly_limit: true,
        plan: {
          select: {
            whatsapp_included_monthly: true,
            allow_whatsapp_overage_billing: true,
          },
        },
      },
    });

    const counter = await this.prisma.clinicUsageCounter.findUnique({
      where: { clinic_id_period_start: { clinic_id: clinicId, period_start: periodStart } },
      select: {
        whatsapp_utility_sent: true,
        whatsapp_marketing_sent: true,
        whatsapp_authentication_sent: true,
      },
    });

    const utilSent = counter?.whatsapp_utility_sent ?? 0;
    const mktSent = counter?.whatsapp_marketing_sent ?? 0;
    const authSent = counter?.whatsapp_authentication_sent ?? 0;
    const totalSent = utilSent + mktSent + authSent;

    // BYO-WABA clinics manage their own WhatsApp billing with Meta — we don't
    // charge them platform overage on top.
    if (!clinic || clinic.has_own_waba) {
      return this.emptyBreakdown(utilSent, mktSent, authSent, 0);
    }

    const included = clinic.plan?.whatsapp_included_monthly ?? 0;
    const overageEnabled = clinic.plan?.allow_whatsapp_overage_billing ?? false;
    const overageTotal = Math.max(0, totalSent - included);

    // If overage is disabled on the plan, return a breakdown with all-zero
    // billable counts (the hard limit blocks further sends instead).
    if (!overageEnabled || overageTotal === 0 || totalSent === 0) {
      return this.emptyBreakdown(utilSent, mktSent, authSent, included);
    }

    // Pro-rata allocation. AUTH bucket absorbs remainders so the sum exactly
    // equals overageTotal (no rounding drift on the customer's bill).
    const utilBillable = Math.round((utilSent / totalSent) * overageTotal);
    const mktBillable = Math.round((mktSent / totalSent) * overageTotal);
    const authBillable = Math.max(0, overageTotal - utilBillable - mktBillable);

    const utilAmount = priceForCategory('UTILITY', utilBillable);
    const mktAmount = priceForCategory('MARKETING', mktBillable);
    const authAmount = priceForCategory('AUTHENTICATION', authBillable);

    return {
      utility: {
        sent: utilSent,
        billable: utilBillable,
        unit_price: WHATSAPP_OVERAGE_PRICE_INR.UTILITY,
        amount: utilAmount,
      },
      marketing: {
        sent: mktSent,
        billable: mktBillable,
        unit_price: WHATSAPP_OVERAGE_PRICE_INR.MARKETING,
        amount: mktAmount,
      },
      authentication: {
        sent: authSent,
        billable: authBillable,
        unit_price: WHATSAPP_OVERAGE_PRICE_INR.AUTHENTICATION,
        amount: authAmount,
      },
      total_sent: totalSent,
      total_billable: overageTotal,
      total_amount: round2(utilAmount + mktAmount + authAmount),
      included_quota: included,
    };
  }

  /**
   * Public helper for the dashboard: returns the current month's running
   * overage estimate for a clinic.
   */
  async getCurrentMonthEstimate(clinicId: string): Promise<OverageBreakdown> {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return this.computeForPeriod(clinicId, periodStart);
  }

  /**
   * Month-end cron: at 02:30 IST on day 1 of every month, generate platform
   * invoices for the previous month's WhatsApp overage. Mirrors the existing
   * subscription invoice cron at 02:00.
   */
  @Cron('0 30 2 1 * *', { timeZone: 'Asia/Kolkata' })
  async billPreviousMonthOverage(): Promise<void> {
    const now = new Date();
    // First day of PREVIOUS month, UTC midnight (matches counter.period_start).
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));

    this.logger.log(
      `WhatsApp overage billing run: period ${periodStart.toISOString()} → ${periodEnd.toISOString()}`,
    );

    // Pull every clinic that COULD owe overage: active subscription + plan that
    // permits overage + a usage counter row for the period.
    const candidates = await this.prisma.clinic.findMany({
      where: {
        subscription_status: { in: ['active', 'trial'] },
        plan: { allow_whatsapp_overage_billing: true },
        has_own_waba: false,
      },
      select: { id: true, name: true },
    });

    let billed = 0;
    let skipped = 0;
    for (const c of candidates) {
      try {
        const breakdown = await this.computeForPeriod(c.id, periodStart);
        if (breakdown.total_amount <= 0) {
          skipped++;
          continue;
        }

        // Don't double-bill: skip if an overage invoice for this period+clinic
        // already exists (cron re-run safety).
        const existing = await this.prisma.platformInvoice.findFirst({
          where: {
            clinic_id: c.id,
            invoice_type: 'wa_overage',
            period_start: periodStart,
          },
          select: { id: true },
        });
        if (existing) {
          skipped++;
          continue;
        }

        await this.createOverageInvoice(c.id, periodStart, periodEnd, breakdown);
        billed++;
      } catch (err) {
        this.logger.error(
          `WhatsApp overage billing failed for clinic ${c.id} (${c.name}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(`WhatsApp overage billing complete: ${billed} invoiced, ${skipped} skipped`);
  }

  /**
   * Creates a `wa_overage` PlatformInvoice with per-category line items and
   * issues a Razorpay payment link via the platform-billing service.
   */
  private async createOverageInvoice(
    clinicId: string,
    periodStart: Date,
    periodEnd: Date,
    breakdown: OverageBreakdown,
  ): Promise<void> {
    const lineItems = this.toLineItems(breakdown);
    if (lineItems.length === 0 || breakdown.total_amount <= 0) return;

    await this.platformBilling.createOverageInvoice({
      clinicId,
      periodStart,
      periodEnd,
      totalAmount: breakdown.total_amount,
      lineItems,
      sendImmediately: true,
    });
  }

  private toLineItems(b: OverageBreakdown): OverageLineItem[] {
    const items: OverageLineItem[] = [];
    if (b.utility.billable > 0) {
      items.push({
        description: `WhatsApp utility messages above quota (${b.utility.billable} × ₹${b.utility.unit_price})`,
        quantity: b.utility.billable,
        unit_price: b.utility.unit_price,
        amount: b.utility.amount,
        category: 'WHATSAPP_UTILITY_OVERAGE',
      });
    }
    if (b.marketing.billable > 0) {
      items.push({
        description: `WhatsApp marketing messages above quota (${b.marketing.billable} × ₹${b.marketing.unit_price})`,
        quantity: b.marketing.billable,
        unit_price: b.marketing.unit_price,
        amount: b.marketing.amount,
        category: 'WHATSAPP_MARKETING_OVERAGE',
      });
    }
    if (b.authentication.billable > 0) {
      items.push({
        description: `WhatsApp authentication / OTP messages above quota (${b.authentication.billable} × ₹${b.authentication.unit_price})`,
        quantity: b.authentication.billable,
        unit_price: b.authentication.unit_price,
        amount: b.authentication.amount,
        category: 'WHATSAPP_AUTHENTICATION_OVERAGE',
      });
    }
    return items;
  }

  private emptyBreakdown(
    utilSent: number,
    mktSent: number,
    authSent: number,
    included: number,
  ): OverageBreakdown {
    const zero = (sent: number, unit_price: number) => ({ sent, billable: 0, unit_price, amount: 0 });
    return {
      utility: zero(utilSent, WHATSAPP_OVERAGE_PRICE_INR.UTILITY),
      marketing: zero(mktSent, WHATSAPP_OVERAGE_PRICE_INR.MARKETING),
      authentication: zero(authSent, WHATSAPP_OVERAGE_PRICE_INR.AUTHENTICATION),
      total_sent: utilSent + mktSent + authSent,
      total_billable: 0,
      total_amount: 0,
      included_quota: included,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Re-export the category type so callers can use it from a single place.
export type { WhatsAppCategory };
