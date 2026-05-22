"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WhatsAppOverageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppOverageService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const whatsapp_pricing_constants_js_1 = require("../communication/whatsapp-pricing.constants.js");
const platform_billing_service_js_1 = require("./platform-billing.service.js");
let WhatsAppOverageService = WhatsAppOverageService_1 = class WhatsAppOverageService {
    prisma;
    platformBilling;
    logger = new common_1.Logger(WhatsAppOverageService_1.name);
    constructor(prisma, platformBilling) {
        this.prisma = prisma;
        this.platformBilling = platformBilling;
    }
    async computeForPeriod(clinicId, periodStart) {
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
        if (!clinic || clinic.has_own_waba) {
            return this.emptyBreakdown(utilSent, mktSent, authSent, 0);
        }
        const included = clinic.plan?.whatsapp_included_monthly ?? 0;
        const overageEnabled = clinic.plan?.allow_whatsapp_overage_billing ?? false;
        const overageTotal = Math.max(0, totalSent - included);
        if (!overageEnabled || overageTotal === 0 || totalSent === 0) {
            return this.emptyBreakdown(utilSent, mktSent, authSent, included);
        }
        const utilBillable = Math.round((utilSent / totalSent) * overageTotal);
        const mktBillable = Math.round((mktSent / totalSent) * overageTotal);
        const authBillable = Math.max(0, overageTotal - utilBillable - mktBillable);
        const utilAmount = (0, whatsapp_pricing_constants_js_1.priceForCategory)('UTILITY', utilBillable);
        const mktAmount = (0, whatsapp_pricing_constants_js_1.priceForCategory)('MARKETING', mktBillable);
        const authAmount = (0, whatsapp_pricing_constants_js_1.priceForCategory)('AUTHENTICATION', authBillable);
        return {
            utility: {
                sent: utilSent,
                billable: utilBillable,
                unit_price: whatsapp_pricing_constants_js_1.WHATSAPP_OVERAGE_PRICE_INR.UTILITY,
                amount: utilAmount,
            },
            marketing: {
                sent: mktSent,
                billable: mktBillable,
                unit_price: whatsapp_pricing_constants_js_1.WHATSAPP_OVERAGE_PRICE_INR.MARKETING,
                amount: mktAmount,
            },
            authentication: {
                sent: authSent,
                billable: authBillable,
                unit_price: whatsapp_pricing_constants_js_1.WHATSAPP_OVERAGE_PRICE_INR.AUTHENTICATION,
                amount: authAmount,
            },
            total_sent: totalSent,
            total_billable: overageTotal,
            total_amount: round2(utilAmount + mktAmount + authAmount),
            included_quota: included,
        };
    }
    async getCurrentMonthEstimate(clinicId) {
        const now = new Date();
        const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        return this.computeForPeriod(clinicId, periodStart);
    }
    async billPreviousMonthOverage() {
        const now = new Date();
        const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
        this.logger.log(`WhatsApp overage billing run: period ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);
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
            }
            catch (err) {
                this.logger.error(`WhatsApp overage billing failed for clinic ${c.id} (${c.name}): ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        this.logger.log(`WhatsApp overage billing complete: ${billed} invoiced, ${skipped} skipped`);
    }
    async createOverageInvoice(clinicId, periodStart, periodEnd, breakdown) {
        const lineItems = this.toLineItems(breakdown);
        if (lineItems.length === 0 || breakdown.total_amount <= 0)
            return;
        await this.platformBilling.createOverageInvoice({
            clinicId,
            periodStart,
            periodEnd,
            totalAmount: breakdown.total_amount,
            lineItems,
            sendImmediately: true,
        });
    }
    toLineItems(b) {
        const items = [];
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
    emptyBreakdown(utilSent, mktSent, authSent, included) {
        const zero = (sent, unit_price) => ({ sent, billable: 0, unit_price, amount: 0 });
        return {
            utility: zero(utilSent, whatsapp_pricing_constants_js_1.WHATSAPP_OVERAGE_PRICE_INR.UTILITY),
            marketing: zero(mktSent, whatsapp_pricing_constants_js_1.WHATSAPP_OVERAGE_PRICE_INR.MARKETING),
            authentication: zero(authSent, whatsapp_pricing_constants_js_1.WHATSAPP_OVERAGE_PRICE_INR.AUTHENTICATION),
            total_sent: utilSent + mktSent + authSent,
            total_billable: 0,
            total_amount: 0,
            included_quota: included,
        };
    }
};
exports.WhatsAppOverageService = WhatsAppOverageService;
__decorate([
    (0, schedule_1.Cron)('0 30 2 1 * *', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsAppOverageService.prototype, "billPreviousMonthOverage", null);
exports.WhatsAppOverageService = WhatsAppOverageService = WhatsAppOverageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        platform_billing_service_js_1.PlatformBillingService])
], WhatsAppOverageService);
function round2(n) {
    return Math.round(n * 100) / 100;
}
//# sourceMappingURL=whatsapp-overage.service.js.map