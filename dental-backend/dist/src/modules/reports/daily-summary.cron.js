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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DailySummaryCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailySummaryCronService = exports.WEEKLY_SUMMARY_WA_TEMPLATE = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const prisma_service_js_1 = require("../../database/prisma.service.js");
const reports_service_js_1 = require("./reports.service.js");
const email_provider_js_1 = require("../communication/providers/email.provider.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const PLATFORM_CLINIC_ID = '__platform__';
exports.WEEKLY_SUMMARY_WA_TEMPLATE = 'weekly_clinic_summary';
const NEW_CLINIC_DAYS = 7;
let DailySummaryCronService = DailySummaryCronService_1 = class DailySummaryCronService {
    prisma;
    reportsService;
    emailProvider;
    communicationService;
    config;
    logger = new common_1.Logger(DailySummaryCronService_1.name);
    openai;
    constructor(prisma, reportsService, emailProvider, communicationService, config) {
        this.prisma = prisma;
        this.reportsService = reportsService;
        this.emailProvider = emailProvider;
        this.communicationService = communicationService;
        this.config = config;
        const apiKey = this.config.get('OPENAI_API_KEY');
        this.openai = apiKey ? new openai_1.default({ apiKey }) : null;
    }
    ensureEmailConfigured() {
        if (this.emailProvider.isConfigured(PLATFORM_CLINIC_ID))
            return true;
        const host = this.config.get('app.smtp.host');
        const user = this.config.get('app.smtp.user');
        if (host && user) {
            this.emailProvider.configure(PLATFORM_CLINIC_ID, {
                host,
                port: this.config.get('app.smtp.port') || 587,
                user,
                pass: this.config.get('app.smtp.pass') || '',
                from: this.config.get('app.smtp.from') || user,
                secure: this.config.get('app.smtp.secure') || false,
            }, 'smtp-env');
            return true;
        }
        return false;
    }
    firstName(name) {
        const cleaned = (name ?? '').trim();
        if (!cleaned)
            return 'Doctor';
        const withoutTitle = cleaned.replace(/^(dr\.?|doctor)\s+/i, '').trim();
        const first = (withoutTitle || cleaned).split(/\s+/)[0];
        return first || 'Doctor';
    }
    async sendWeeklySummaries(channels = ['email', 'whatsapp']) {
        this.logger.log(`Starting weekly summary cron... channels: ${channels.join(', ')}`);
        const sendEmail = channels.includes('email');
        const sendWhatsApp = channels.includes('whatsapp');
        const emailReady = sendEmail && this.ensureEmailConfigured();
        const now = new Date();
        const daysSinceMonday = (now.getDay() + 6) % 7;
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
        const lastWeekStart = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() - 7);
        const lastWeekEnd = thisWeekStart;
        const priorWeekStart = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate() - 7);
        const nextWeekStart = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + 7);
        const lastWeekEndInclusive = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate() - 1);
        const weekRange = `${lastWeekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${lastWeekEndInclusive.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        let emailSent = 0;
        let waSent = 0;
        let skipped = 0;
        try {
            const clinics = await this.prisma.clinic.findMany({
                where: { subscription_status: { in: ['active', 'trial'] } },
                select: {
                    id: true,
                    name: true,
                    created_at: true,
                    users: {
                        where: { role: { in: ['Admin', 'SuperAdmin'] }, status: 'active' },
                        select: { email: true, name: true, phone: true },
                    },
                },
            });
            for (const clinic of clinics) {
                const recipients = clinic.users.filter((u) => u.email || u.phone);
                if (recipients.length === 0) {
                    skipped++;
                    continue;
                }
                try {
                    const clinicAgeDays = Math.floor((now.getTime() - new Date(clinic.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    const isNewClinic = clinicAgeDays < NEW_CLINIC_DAYS;
                    const summary = await this.reportsService.getDashboardSummary(clinic.id, undefined, undefined, now);
                    const [weekAppointments, weekRevenueAgg, priorWeekAppointments, priorWeekRevenueAgg, thisWeekScheduled] = await Promise.all([
                        this.prisma.appointment.count({
                            where: { clinic_id: clinic.id, appointment_date: { gte: lastWeekStart, lt: lastWeekEnd }, status: { not: 'cancelled' } },
                        }),
                        this.prisma.payment.aggregate({
                            _sum: { amount: true },
                            where: { invoice: { clinic_id: clinic.id }, paid_at: { gte: lastWeekStart, lt: lastWeekEnd } },
                        }),
                        isNewClinic ? Promise.resolve(0) : this.prisma.appointment.count({
                            where: { clinic_id: clinic.id, appointment_date: { gte: priorWeekStart, lt: lastWeekStart }, status: { not: 'cancelled' } },
                        }),
                        isNewClinic ? Promise.resolve({ _sum: { amount: null } }) : this.prisma.payment.aggregate({
                            _sum: { amount: true },
                            where: { invoice: { clinic_id: clinic.id }, paid_at: { gte: priorWeekStart, lt: lastWeekStart } },
                        }),
                        this.prisma.appointment.count({
                            where: { clinic_id: clinic.id, appointment_date: { gte: thisWeekStart, lt: nextWeekStart }, status: { not: 'cancelled' } },
                        }),
                    ]);
                    const weekRevenue = Number(weekRevenueAgg._sum.amount ?? 0);
                    const priorWeekRevenue = Number(priorWeekRevenueAgg._sum.amount ?? 0);
                    const week = { appointments: weekAppointments, revenue: weekRevenue, scheduledThisWeek: thisWeekScheduled };
                    const prior = { appointments: priorWeekAppointments, revenue: priorWeekRevenue };
                    const aiInsight = await this.generateAiInsight(clinic.name, weekRange, summary, week, prior, clinicAgeDays);
                    const currency = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                    const statsLine = `Last week: ${week.appointments} appointments, ${currency(week.revenue)} revenue | This week: ${week.scheduledThisWeek} scheduled`;
                    const financeLine = `Outstanding: ${currency(summary.outstanding_amount)} · Month revenue: ${currency(summary.this_month_revenue)} · Expenses: ${currency(summary.this_month_expenses)} · Net profit: ${currency(summary.net_profit)}`;
                    const seenPhones = new Set();
                    for (const recipient of recipients) {
                        if (sendEmail && emailReady && recipient.email) {
                            try {
                                const html = this.buildEmailHtml(clinic.name, recipient.name, summary, week, weekRange, aiInsight, clinicAgeDays);
                                await this.emailProvider.send({
                                    clinicId: PLATFORM_CLINIC_ID,
                                    to: recipient.email,
                                    subject: clinicAgeDays < NEW_CLINIC_DAYS
                                        ? `🎉 Welcome to Smart Dental Desk — ${clinic.name}`
                                        : `📊 Your weekly report — ${clinic.name} | ${weekRange}`,
                                    body: '',
                                    html,
                                });
                                emailSent++;
                            }
                            catch (err) {
                                this.logger.warn(`Email failed for ${recipient.email}: ${err.message}`);
                            }
                        }
                        if (sendWhatsApp && recipient.phone && !seenPhones.has(recipient.phone)) {
                            seenPhones.add(recipient.phone);
                            const lastTen = recipient.phone.replace(/\D/g, '').slice(-10);
                            const recentFailures = await this.prisma.communicationMessage.count({
                                where: {
                                    clinic_id: clinic.id,
                                    channel: 'whatsapp',
                                    category: 'weekly_summary',
                                    status: 'failed',
                                    recipient: { endsWith: lastTen },
                                    created_at: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
                                },
                            });
                            if (recentFailures >= 3) {
                                this.logger.warn(`Suppressing weekly_summary WhatsApp to ${recipient.phone} (clinic ${clinic.name}) — ${recentFailures} recent failures`);
                                continue;
                            }
                            try {
                                await this.communicationService.enqueueSystemMessage({
                                    clinicId: clinic.id,
                                    channel: 'whatsapp',
                                    to: recipient.phone,
                                    category: 'weekly_summary',
                                    templateId: exports.WEEKLY_SUMMARY_WA_TEMPLATE,
                                    language: 'en',
                                    variables: {
                                        '1': this.firstName(recipient.name),
                                        '2': clinic.name,
                                        '3': weekRange,
                                        '4': statsLine,
                                        '5': financeLine,
                                        '6': aiInsight,
                                    },
                                    metadata: { type: 'weekly_summary' },
                                    jobOptions: { attempts: 1 },
                                });
                                waSent++;
                            }
                            catch (err) {
                                this.logger.warn(`WhatsApp enqueue failed for ${recipient.phone}: ${err.message}`);
                            }
                        }
                    }
                }
                catch (err) {
                    this.logger.error(`Failed to process clinic ${clinic.id}: ${err.message}`);
                    skipped++;
                }
            }
        }
        catch (err) {
            this.logger.error(`Weekly summary cron failed: ${err.message}`, err.stack);
        }
        this.logger.log(`Done. Email: ${emailSent}, WhatsApp: ${waSent}, Skipped: ${skipped}`);
    }
    async generateAiInsight(clinicName, weekRange, summary, week, prior, clinicAgeDays) {
        if (clinicAgeDays < NEW_CLINIC_DAYS) {
            const fallback = `Welcome to Smart Dental Desk! 🎉 You're all set up. Every Monday you'll receive a weekly recap like this to help your clinic grow. ${week.scheduledThisWeek > 0 ? `${week.scheduledThisWeek} appointments scheduled this week — great start!` : 'Your journey begins this week!'}`;
            if (!this.openai)
                return fallback;
            try {
                const prompt = `You are a warm onboarding coach for Smart Dental Desk (dental clinic software). A new clinic "${clinicName}" just joined. Write a 2-sentence excited welcome for their first weekly digest. Mention they'll get a recap every Monday, make them feel thrilled. ${week.scheduledThisWeek > 0 ? `They have ${week.scheduledThisWeek} appointments scheduled this week.` : ''} Plain text only, end with an emoji, under 220 characters.`;
                const r = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 90,
                });
                return r.choices[0]?.message?.content?.trim() || fallback;
            }
            catch {
                return fallback;
            }
        }
        const pct = (v, a) => a > 0 ? `${v >= a ? '↑' : '↓'}${Math.abs(((v - a) / a) * 100).toFixed(0)}%` : 'n/a';
        const fallback = [
            `Revenue ${pct(week.revenue, prior.revenue)} vs the week before.`,
            summary.pending_invoices > 0
                ? `${summary.pending_invoices} invoice${summary.pending_invoices > 1 ? 's' : ''} pending — follow up to recover dues.`
                : 'All invoices cleared — great job!',
            '⚠️ AI estimate.',
        ].join(' ');
        if (!this.openai)
            return fallback;
        try {
            const prompt = `You are a friendly dental clinic advisor. Write a short weekly insight for the clinic owner.

Data for the week ${weekRange} at ${clinicName}:
- Last week: ${week.appointments} appointments, ₹${week.revenue.toFixed(0)} revenue
- Week before: ${prior.appointments} appointments, ₹${prior.revenue.toFixed(0)} revenue
- Scheduled this coming week: ${week.scheduledThisWeek} appointments
- Pending invoices: ${summary.pending_invoices}, Outstanding: ₹${summary.outstanding_amount.toFixed(0)}

Rules:
- Max 2 sentences, under 220 characters total
- Friendly and encouraging tone
- Use ↑/↓ for week-over-week trends
- One specific actionable tip for the week ahead
- Plain text only, no asterisks or underscores
- End with: ⚠️ AI estimate.`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.6,
                max_tokens: 110,
            });
            const text = response.choices[0]?.message?.content?.trim();
            if (!text)
                return fallback;
            return text.includes('⚠️') ? text : `${text} ⚠️ AI estimate.`;
        }
        catch (err) {
            this.logger.warn(`AI insight failed: ${err.message}`);
            return fallback;
        }
    }
    buildEmailHtml(clinicName, recipientName, summary, week, weekRange, aiInsight, clinicAgeDays) {
        const isNewClinic = clinicAgeDays < NEW_CLINIC_DAYS;
        const currency = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        const firstName = this.firstName(recipientName);
        const insightText = aiInsight.replace(' ⚠️ AI estimate.', '').replace('⚠️ AI estimate.', '').trim();
        const showDisclaimer = !isNewClinic;
        const insightHeader = isNewClinic
            ? `🎉 Welcome to Smart Dental Desk`
            : `🤖 Smart Insight`;
        const insightBg = isNewClinic ? '#f0fdf4' : '#f5f3ff';
        const insightBorder = isNewClinic ? '#22c55e' : '#7c3aed';
        const insightTitleColor = isNewClinic ? '#15803d' : '#7c3aed';
        const statsSection = isNewClinic
            ? `<!-- Welcome stats — minimal, just the week ahead -->
        <tr><td style="padding:0 0 20px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center">
                <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600">This Week's Schedule</p>
                <p style="margin:8px 0 2px;font-size:28px;font-weight:700;color:#1d4ed8">${week.scheduledThisWeek}</p>
                <p style="margin:0;font-size:13px;color:#6b7280">appointments scheduled</p>
              </td>
            </tr>
          </table>
        </td></tr>`
            : `<!-- Stat cards -->
        <tr><td style="padding:0 0 20px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="31%" style="background:#eff6ff;border-radius:10px;padding:14px 12px;text-align:center">
                <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Last Week</p>
                <p style="margin:6px 0 2px;font-size:24px;font-weight:700;color:#1d4ed8">${week.appointments}</p>
                <p style="margin:0;font-size:12px;color:#6b7280">appointments</p>
              </td>
              <td width="3%"></td>
              <td width="31%" style="background:#f0fdf4;border-radius:10px;padding:14px 12px;text-align:center">
                <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Revenue</p>
                <p style="margin:6px 0 2px;font-size:20px;font-weight:700;color:#15803d">${currency(week.revenue)}</p>
                <p style="margin:0;font-size:12px;color:#6b7280">collected</p>
              </td>
              <td width="3%"></td>
              <td width="31%" style="background:#faf5ff;border-radius:10px;padding:14px 12px;text-align:center">
                <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">This Week</p>
                <p style="margin:6px 0 2px;font-size:24px;font-weight:700;color:#7c3aed">${week.scheduledThisWeek}</p>
                <p style="margin:0;font-size:12px;color:#6b7280">scheduled</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Finance strip (month to date) -->
        <tr><td style="padding:0 0 20px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px">
            <tr>
              <td style="padding:12px 10px;border-right:1px solid #e5e7eb;text-align:center;width:25%">
                <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600">Outstanding</p>
                <p style="margin:5px 0 0;font-size:14px;font-weight:700;color:#dc2626">${currency(summary.outstanding_amount)}</p>
              </td>
              <td style="padding:12px 10px;border-right:1px solid #e5e7eb;text-align:center;width:25%">
                <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600">Month Revenue</p>
                <p style="margin:5px 0 0;font-size:14px;font-weight:700;color:#059669">${currency(summary.this_month_revenue)}</p>
              </td>
              <td style="padding:12px 10px;border-right:1px solid #e5e7eb;text-align:center;width:25%">
                <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600">Expenses</p>
                <p style="margin:5px 0 0;font-size:14px;font-weight:700;color:#d97706">${currency(summary.this_month_expenses)}</p>
              </td>
              <td style="padding:12px 10px;text-align:center;width:25%">
                <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600">Net Profit</p>
                <p style="margin:5px 0 0;font-size:14px;font-weight:700;color:${summary.net_profit >= 0 ? '#15803d' : '#dc2626'}">${currency(summary.net_profit)}</p>
              </td>
            </tr>
          </table>
        </td></tr>`;
        return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07)">

        <tr>
          <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:24px 28px">
            <p style="margin:0;color:#bfdbfe;font-size:13px">${isNewClinic ? '🎉 Welcome aboard, ' + firstName + '!' : '📊 Good morning, ' + firstName + '!'}</p>
            <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:700">${clinicName}</h1>
            <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">${isNewClinic ? 'Your Smart Dental Desk journey starts now' : 'Your week in review · ' + weekRange}</p>
          </td>
        </tr>

        <tr><td style="padding:24px 28px">
          <table width="100%" cellpadding="0" cellspacing="0">

            ${statsSection}

            <!-- AI / Welcome Insight -->
            <tr><td>
              <div style="background:${insightBg};border-left:3px solid ${insightBorder};border-radius:0 10px 10px 0;padding:14px 18px">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${insightTitleColor};text-transform:uppercase;letter-spacing:0.04em">${insightHeader}</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${insightText}</p>
                ${showDisclaimer ? `<p style="margin:8px 0 0;font-size:11px;color:#9ca3af;font-style:italic">⚠️ AI-generated — verify before acting.</p>` : ''}
              </div>
            </td></tr>

          </table>
        </td></tr>

        <tr>
          <td style="padding:16px 28px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">Have a great week! — <strong>Smart Dental Desk</strong></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }
};
exports.DailySummaryCronService = DailySummaryCronService;
__decorate([
    (0, schedule_1.Cron)('0 0 8 * * 1', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], DailySummaryCronService.prototype, "sendWeeklySummaries", null);
exports.DailySummaryCronService = DailySummaryCronService = DailySummaryCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        reports_service_js_1.ReportsService,
        email_provider_js_1.EmailProvider,
        communication_service_js_1.CommunicationService,
        config_1.ConfigService])
], DailySummaryCronService);
//# sourceMappingURL=daily-summary.cron.js.map