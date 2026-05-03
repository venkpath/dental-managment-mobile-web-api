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
var SubscriptionReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionReminderService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const automation_service_js_1 = require("../automation/automation.service.js");
const name_util_js_1 = require("../../common/utils/name.util.js");
let SubscriptionReminderService = SubscriptionReminderService_1 = class SubscriptionReminderService {
    prisma;
    communicationService;
    automationService;
    logger = new common_1.Logger(SubscriptionReminderService_1.name);
    constructor(prisma, communicationService, automationService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
        this.automationService = automationService;
    }
    async sendDailyReminders() {
        this.logger.log('Starting daily subscription reminder cron');
        try {
            await Promise.all([
                this.processTrialReminders(),
                this.processRenewalReminders(),
                this.processExpiredReminders(),
            ]);
        }
        catch (e) {
            this.logger.error(`Subscription reminder cron failed: ${e.message}`, e.stack);
        }
        this.logger.log('Daily subscription reminder cron complete');
    }
    async processTrialReminders() {
        const now = new Date();
        const windowStart = this.startOfDay(this.addDays(now, -7));
        const windowEnd = this.endOfDay(this.addDays(now, 7));
        const clinics = await this.prisma.clinic.findMany({
            where: {
                subscription_status: 'trial',
                trial_ends_at: { gte: windowStart, lte: windowEnd },
            },
            include: { plan: { select: { name: true, price_monthly: true, price_yearly: true } } },
        });
        for (const clinic of clinics) {
            try {
                await this.sendTrialReminderForClinic(clinic);
            }
            catch (e) {
                this.logger.warn(`Trial reminder failed for clinic ${clinic.id}: ${e.message}`);
            }
        }
    }
    async sendTrialReminderForClinic(clinic) {
        if (!clinic || !clinic.trial_ends_at)
            return;
        const rule = await this.automationService.getRuleConfig(clinic.id, 'subscription_payment_reminder');
        if (rule && !rule.is_enabled) {
            this.logger.log(`subscription_payment_reminder disabled for clinic ${clinic.id} — skipping`);
            return;
        }
        const config = rule?.config ?? {};
        const daysBefore = this.parseNumberArray(config['trial_reminder_days_before'], [3, 1]);
        const daysAfter = this.parseNumberArray(config['trial_reminder_days_after'], [0]);
        const daysPostTrial = this.parseNumberArray(config['post_trial_reminder_days_after'], [3, 7]);
        const today = this.startOfDay(new Date());
        const trialEnd = this.startOfDay(clinic.trial_ends_at);
        const daysFromTrialEnd = Math.round((trialEnd.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        let templateName = null;
        if (daysFromTrialEnd > 0 && daysBefore.includes(daysFromTrialEnd)) {
            templateName = 'platform_trial_ending_soon';
        }
        else if (daysFromTrialEnd <= 0 && daysAfter.includes(-daysFromTrialEnd)) {
            templateName = 'platform_trial_expired';
        }
        else if (daysFromTrialEnd < 0 && daysPostTrial.includes(-daysFromTrialEnd)) {
            templateName = 'platform_payment_reminder_post_trial';
        }
        if (!templateName)
            return;
        const admin = await this.findAdminUser(clinic.id);
        if (!admin) {
            this.logger.log(`No admin with phone for clinic ${clinic.id} — skipping ${templateName}`);
            return;
        }
        if (await this.alreadySentToday(clinic.id, templateName, admin.phone)) {
            this.logger.log(`${templateName} already sent today for clinic ${clinic.id} — skipping`);
            return;
        }
        const namedVars = {
            Dentist_Name: (0, name_util_js_1.stripDoctorPrefix)(admin.name),
            Trial_End_Date: this.formatDate(trialEnd),
        };
        await this.communicationService.sendStaffWhatsAppTemplate(clinic.id, admin.phone, templateName, namedVars, {
            automation: 'subscription_payment_reminder',
            reminder_kind: templateName,
            days_from_trial_end: daysFromTrialEnd,
            admin_user_id: admin.id,
        });
        this.logger.log(`Sent ${templateName} to ${admin.phone} for clinic ${clinic.id}`);
    }
    async processRenewalReminders() {
        const now = new Date();
        const windowStart = this.startOfDay(now);
        const windowEnd = this.endOfDay(this.addDays(now, 14));
        const clinics = await this.prisma.clinic.findMany({
            where: {
                subscription_status: 'active',
                next_billing_at: { gte: windowStart, lte: windowEnd },
            },
            include: { plan: { select: { name: true, price_monthly: true, price_yearly: true } } },
        });
        for (const clinic of clinics) {
            try {
                await this.sendRenewalReminderForClinic(clinic);
            }
            catch (e) {
                this.logger.warn(`Renewal reminder failed for clinic ${clinic.id}: ${e.message}`);
            }
        }
    }
    async sendRenewalReminderForClinic(clinic) {
        if (!clinic || !clinic.next_billing_at)
            return;
        const rule = await this.automationService.getRuleConfig(clinic.id, 'subscription_payment_reminder');
        if (rule && !rule.is_enabled) {
            this.logger.log(`subscription_payment_reminder disabled for clinic ${clinic.id} — skipping renewal`);
            return;
        }
        const config = rule?.config ?? {};
        const daysBefore = this.parseNumberArray(config['renewal_reminder_days_before'], [7, 3, 1]);
        const today = this.startOfDay(new Date());
        const renewal = this.startOfDay(clinic.next_billing_at);
        const daysUntilRenewal = Math.round((renewal.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        if (daysUntilRenewal <= 0 || !daysBefore.includes(daysUntilRenewal))
            return;
        const templateName = 'platform_subscription_renewal_reminder';
        const admin = await this.findAdminUser(clinic.id);
        if (!admin) {
            this.logger.log(`No admin with phone for clinic ${clinic.id} — skipping ${templateName}`);
            return;
        }
        if (await this.alreadySentToday(clinic.id, templateName, admin.phone)) {
            this.logger.log(`${templateName} already sent today for clinic ${clinic.id} — skipping`);
            return;
        }
        const namedVars = {
            Dentist_Name: (0, name_util_js_1.stripDoctorPrefix)(admin.name),
            Renewal_Date: this.formatDate(renewal),
        };
        await this.communicationService.sendStaffWhatsAppTemplate(clinic.id, admin.phone, templateName, namedVars, {
            automation: 'subscription_payment_reminder',
            reminder_kind: templateName,
            days_until_renewal: daysUntilRenewal,
            admin_user_id: admin.id,
        });
        this.logger.log(`Sent ${templateName} (${daysUntilRenewal}d) to ${admin.phone} for clinic ${clinic.id}`);
    }
    async processExpiredReminders() {
        const now = new Date();
        const windowStart = this.startOfDay(this.addDays(now, -30));
        const windowEnd = this.endOfDay(now);
        const clinics = await this.prisma.clinic.findMany({
            where: {
                subscription_status: { in: ['expired', 'cancelled'] },
                OR: [
                    { next_billing_at: { gte: windowStart, lte: windowEnd } },
                    { trial_ends_at: { gte: windowStart, lte: windowEnd } },
                ],
            },
            include: { plan: { select: { name: true, price_monthly: true, price_yearly: true } } },
        });
        for (const clinic of clinics) {
            try {
                await this.sendExpiredReminderForClinic(clinic);
            }
            catch (e) {
                this.logger.warn(`Expired reminder failed for clinic ${clinic.id}: ${e.message}`);
            }
        }
    }
    async sendExpiredReminderForClinic(clinic) {
        if (!clinic)
            return;
        const anchor = clinic.next_billing_at ?? clinic.trial_ends_at;
        if (!anchor)
            return;
        const rule = await this.automationService.getRuleConfig(clinic.id, 'subscription_payment_reminder');
        if (rule && !rule.is_enabled) {
            this.logger.log(`subscription_payment_reminder disabled for clinic ${clinic.id} — skipping expired`);
            return;
        }
        const config = rule?.config ?? {};
        const expiredDays = this.parseNumberArray(config['expired_reminder_days_after'], [0, 1, 3]);
        const finalDays = this.parseNumberArray(config['final_reminder_days_after'], [7, 14]);
        const today = this.startOfDay(new Date());
        const expiredOn = this.startOfDay(anchor);
        const daysSinceExpiry = Math.round((today.getTime() - expiredOn.getTime()) / (24 * 60 * 60 * 1000));
        if (daysSinceExpiry < 0)
            return;
        let templateName = null;
        if (finalDays.includes(daysSinceExpiry)) {
            templateName = 'platform_final_payment_reminder';
        }
        else if (expiredDays.includes(daysSinceExpiry)) {
            templateName = 'platform_subscription_expired';
        }
        if (!templateName)
            return;
        const admin = await this.findAdminUser(clinic.id);
        if (!admin) {
            this.logger.log(`No admin with phone for clinic ${clinic.id} — skipping ${templateName}`);
            return;
        }
        if (await this.alreadySentToday(clinic.id, templateName, admin.phone)) {
            this.logger.log(`${templateName} already sent today for clinic ${clinic.id} — skipping`);
            return;
        }
        const namedVars = {
            Dentist_Name: (0, name_util_js_1.stripDoctorPrefix)(admin.name),
        };
        await this.communicationService.sendStaffWhatsAppTemplate(clinic.id, admin.phone, templateName, namedVars, {
            automation: 'subscription_payment_reminder',
            reminder_kind: templateName,
            days_since_expiry: daysSinceExpiry,
            admin_user_id: admin.id,
        });
        this.logger.log(`Sent ${templateName} (+${daysSinceExpiry}d) to ${admin.phone} for clinic ${clinic.id}`);
    }
    async findAdminUser(clinicId) {
        const candidates = await this.prisma.user.findMany({
            where: {
                clinic_id: clinicId,
                status: 'active',
                phone: { not: null },
            },
            select: { id: true, name: true, phone: true, role: true, created_at: true },
            orderBy: { created_at: 'asc' },
        });
        const admin = candidates.find((u) => {
            const r = u.role.toLowerCase();
            return r === 'admin' || r === 'superadmin';
        });
        if (admin && admin.phone && admin.phone.trim())
            return admin;
        return null;
    }
    async alreadySentToday(clinicId, templateName, phone) {
        const since = new Date(Date.now() - 22 * 60 * 60 * 1000);
        const tpl = await this.prisma.messageTemplate.findFirst({
            where: {
                template_name: templateName,
                channel: 'whatsapp',
                OR: [{ clinic_id: clinicId }, { clinic_id: null }],
            },
            orderBy: { clinic_id: 'desc' },
            select: { id: true },
        });
        if (!tpl)
            return false;
        const digitsOnly = phone.replace(/[^0-9]/g, '');
        const last10 = digitsOnly.slice(-10);
        const normalizedPhone = last10.length === 10 ? `91${last10}` : digitsOnly;
        const existing = await this.prisma.communicationMessage.findFirst({
            where: {
                clinic_id: clinicId,
                template_id: tpl.id,
                recipient: normalizedPhone,
                created_at: { gte: since },
                status: { notIn: ['failed', 'skipped'] },
            },
            select: { id: true },
        });
        return !!existing;
    }
    formatDate(date) {
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Kolkata',
        });
    }
    parseNumberArray(value, fallback) {
        if (!Array.isArray(value))
            return fallback;
        const nums = value
            .map((v) => Number(v))
            .filter((n) => Number.isInteger(n) && n >= 0);
        return nums.length > 0 ? nums : fallback;
    }
    startOfDay(d) {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
    }
    endOfDay(d) {
        const x = new Date(d);
        x.setHours(23, 59, 59, 999);
        return x;
    }
    addDays(d, days) {
        const x = new Date(d);
        x.setDate(x.getDate() + days);
        return x;
    }
};
exports.SubscriptionReminderService = SubscriptionReminderService;
__decorate([
    (0, schedule_1.Cron)('0 0 9 * * *', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionReminderService.prototype, "sendDailyReminders", null);
exports.SubscriptionReminderService = SubscriptionReminderService = SubscriptionReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService,
        automation_service_js_1.AutomationService])
], SubscriptionReminderService);
//# sourceMappingURL=subscription-reminder.service.js.map