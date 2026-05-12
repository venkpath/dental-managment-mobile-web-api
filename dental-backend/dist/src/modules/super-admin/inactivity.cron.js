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
var InactivityCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InactivityCronService = exports.INACTIVITY_TEMPLATE_SUSPENDED = exports.INACTIVITY_TEMPLATE_REMINDER_40 = exports.INACTIVITY_TEMPLATE_REMINDER_30 = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const super_admin_whatsapp_service_js_1 = require("./super-admin-whatsapp.service.js");
exports.INACTIVITY_TEMPLATE_REMINDER_30 = 'clinic_inactivity_reminder_30';
exports.INACTIVITY_TEMPLATE_REMINDER_40 = 'clinic_inactivity_reminder_40';
exports.INACTIVITY_TEMPLATE_SUSPENDED = 'clinic_account_suspended';
const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 30;
const REMIND_30_DAY = 30;
const REMIND_40_DAY = 40;
const SUSPEND_DAY = 45;
let InactivityCronService = InactivityCronService_1 = class InactivityCronService {
    prisma;
    whatsApp;
    logger = new common_1.Logger(InactivityCronService_1.name);
    constructor(prisma, whatsApp) {
        this.prisma = prisma;
        this.whatsApp = whatsApp;
    }
    async checkInactivity() {
        this.logger.log('Inactivity check started');
        const now = new Date();
        const graceCutoff = new Date(now.getTime() - GRACE_DAYS * DAY_MS);
        const clinics = await this.prisma.clinic.findMany({
            where: {
                is_suspended: false,
                created_at: { lt: graceCutoff },
            },
            select: {
                id: true,
                name: true,
                last_active_at: true,
                created_at: true,
                inactivity_reminder_30_sent: true,
                inactivity_reminder_40_sent: true,
                users: {
                    where: { role: 'SuperAdmin' },
                    select: { name: true, phone: true },
                    take: 1,
                },
            },
        });
        let warned30 = 0, warned40 = 0, suspended = 0;
        for (const clinic of clinics) {
            try {
                const baseline = clinic.last_active_at ?? clinic.created_at;
                const daysInactive = Math.floor((now.getTime() - baseline.getTime()) / DAY_MS);
                if (daysInactive >= SUSPEND_DAY) {
                    await this.suspendClinic(clinic, now);
                    suspended++;
                }
                else if (daysInactive >= REMIND_40_DAY && !clinic.inactivity_reminder_40_sent) {
                    await this.sendReminder(clinic, 40);
                    warned40++;
                }
                else if (daysInactive >= REMIND_30_DAY && !clinic.inactivity_reminder_30_sent) {
                    await this.sendReminder(clinic, 30);
                    warned30++;
                }
            }
            catch (err) {
                this.logger.error(`Inactivity check failed for clinic ${clinic.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        this.logger.log(`Inactivity check done — checked: ${clinics.length}, warned30: ${warned30}, warned40: ${warned40}, suspended: ${suspended}`);
    }
    async runNow() {
        await this.checkInactivity();
        return { checked: 1 };
    }
    async suspendClinic(clinic, now) {
        await this.prisma.clinic.update({
            where: { id: clinic.id },
            data: {
                is_suspended: true,
                suspended_at: now,
                suspension_reason: 'Automatically suspended after 45 days of inactivity',
            },
        });
        const admin = clinic.users[0];
        if (admin?.phone) {
            await this.whatsApp
                .sendTemplate({
                phone: admin.phone,
                templateName: exports.INACTIVITY_TEMPLATE_SUSPENDED,
                bodyParams: [admin.name, clinic.name],
                contactName: admin.name,
            })
                .catch((err) => this.logger.warn(`WA suspension notice failed for ${clinic.id}: ${err.message}`));
        }
        this.logger.warn(`Clinic ${clinic.id} (${clinic.name}) suspended for inactivity`);
    }
    async sendReminder(clinic, day) {
        const admin = clinic.users[0];
        const daysLeft = day === 30 ? 15 : 5;
        const templateName = day === 30 ? exports.INACTIVITY_TEMPLATE_REMINDER_30 : exports.INACTIVITY_TEMPLATE_REMINDER_40;
        if (!admin?.phone) {
            this.logger.warn(`Skipping day-${day} reminder for clinic ${clinic.id} — no admin phone`);
            return;
        }
        try {
            await this.whatsApp.sendTemplate({
                phone: admin.phone,
                templateName,
                bodyParams: [admin.name, clinic.name, String(daysLeft)],
                contactName: admin.name,
            });
        }
        catch (err) {
            this.logger.warn(`WA reminder-${day} failed for ${clinic.id}: ${err instanceof Error ? err.message : String(err)} — will retry tomorrow`);
            return;
        }
        await this.prisma.clinic.update({
            where: { id: clinic.id },
            data: day === 30
                ? { inactivity_reminder_30_sent: true }
                : { inactivity_reminder_40_sent: true },
        });
        this.logger.log(`Sent day-${day} inactivity reminder to clinic ${clinic.id} (${clinic.name})`);
    }
};
exports.InactivityCronService = InactivityCronService;
__decorate([
    (0, schedule_1.Cron)('0 0 9 * * *', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InactivityCronService.prototype, "checkInactivity", null);
exports.InactivityCronService = InactivityCronService = InactivityCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        super_admin_whatsapp_service_js_1.SuperAdminWhatsAppService])
], InactivityCronService);
//# sourceMappingURL=inactivity.cron.js.map