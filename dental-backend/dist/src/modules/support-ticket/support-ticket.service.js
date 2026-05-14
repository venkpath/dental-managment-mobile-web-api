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
var SupportTicketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicketService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const whatsapp_provider_js_1 = require("../communication/providers/whatsapp.provider.js");
const email_provider_js_1 = require("../communication/providers/email.provider.js");
const PLATFORM_CLINIC_ID = '__platform__';
const CATEGORY_LABELS = {
    bug: 'Bug Report',
    feature_request: 'Feature Request',
    billing: 'Billing Question',
    account: 'Account Issue',
    general: 'General Question',
};
let SupportTicketService = SupportTicketService_1 = class SupportTicketService {
    prisma;
    whatsapp;
    emailProvider;
    config;
    logger = new common_1.Logger(SupportTicketService_1.name);
    adminPhone;
    adminEmail;
    constructor(prisma, whatsapp, emailProvider, config) {
        this.prisma = prisma;
        this.whatsapp = whatsapp;
        this.emailProvider = emailProvider;
        this.config = config;
        this.adminPhone = process.env.SUPPORT_WHATSAPP_PHONE || '917353230500';
        this.adminEmail = process.env.SUPPORT_EMAIL || 'support@smartdentaldesk.com';
    }
    async create(ctx, dto) {
        const [user, clinic] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: ctx.userId },
                select: { id: true, name: true, email: true, phone: true },
            }),
            this.prisma.clinic.findUnique({
                where: { id: ctx.clinicId },
                select: { id: true, name: true },
            }),
        ]);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const ticket = await this.prisma.supportTicket.create({
            data: {
                clinic_id: ctx.clinicId,
                user_id: ctx.userId,
                user_name: user.name,
                user_email: user.email,
                user_phone: user.phone,
                clinic_name: clinic?.name ?? null,
                category: dto.category,
                subject: dto.subject,
                message: dto.message,
            },
        });
        this.sendAdminAlert(ticket).catch((err) => this.logger.warn(`Failed to send WhatsApp admin alert: ${err.message}`));
        this.sendAdminAlertEmail(ticket).catch((err) => this.logger.warn(`Failed to send admin alert email: ${err.message}`));
        return ticket;
    }
    async listMine(ctx) {
        return this.prisma.supportTicket.findMany({
            where: { user_id: ctx.userId, clinic_id: ctx.clinicId },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                category: true,
                subject: true,
                status: true,
                created_at: true,
                resolved_at: true,
            },
        });
    }
    async listAll(status) {
        return this.prisma.supportTicket.findMany({
            where: status ? { status } : undefined,
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(id) {
        const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
        if (!ticket)
            throw new common_1.NotFoundException('Support ticket not found');
        return ticket;
    }
    async update(id, dto) {
        await this.findOne(id);
        const resolvedAt = dto.status === 'resolved' || dto.status === 'closed' ? new Date() : undefined;
        return this.prisma.supportTicket.update({
            where: { id },
            data: {
                status: dto.status,
                admin_notes: dto.admin_notes,
                ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
            },
        });
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
        this.logger.warn('SMTP not configured — support ticket emails will be skipped');
        return false;
    }
    ensureWhatsAppConfigured() {
        if (this.whatsapp.isConfigured(PLATFORM_CLINIC_ID))
            return true;
        const accessToken = this.config.get('app.whatsapp.accessToken');
        const phoneNumberId = this.config.get('app.whatsapp.phoneNumberId');
        if (accessToken && phoneNumberId) {
            this.whatsapp.configure(PLATFORM_CLINIC_ID, {
                accessToken,
                phoneNumberId,
                wabaId: this.config.get('app.whatsapp.wabaId') || '',
            }, 'meta-cloud-env');
            return true;
        }
        this.logger.warn('WhatsApp not configured — support ticket admin alert skipped');
        return false;
    }
    async sendAdminAlert(ticket) {
        if (!this.ensureWhatsAppConfigured())
            return;
        return this.whatsapp.send({
            to: this.adminPhone,
            body: `New support ticket from ${ticket.user_name} (${ticket.clinic_name ?? 'unknown clinic'}): [${ticket.category}] ${ticket.subject}`,
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async sendAdminAlertEmail(ticket) {
        if (!this.ensureEmailConfigured())
            return;
        const categoryLabel = CATEGORY_LABELS[ticket.category] ?? ticket.category;
        const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 20px 32px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #fff; margin: 0;">🆘 New Support Ticket</h2>
          <p style="color: #fee2e2; margin: 4px 0 0; font-size: 13px;">${categoryLabel}</p>
        </div>
        <div style="padding: 24px 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h3 style="margin: 0 0 12px; color: #111827;">${escape(ticket.subject)}</h3>
          <table style="width: 100%; font-size: 13px; color: #4b5563; border-collapse: collapse;">
            <tr><td style="padding: 4px 0; width: 110px; color: #9ca3af;">From</td><td>${escape(ticket.user_name)} &lt;${escape(ticket.user_email)}&gt;</td></tr>
            ${ticket.user_phone ? `<tr><td style="padding: 4px 0; color: #9ca3af;">Phone</td><td>${escape(ticket.user_phone)}</td></tr>` : ''}
            ${ticket.clinic_name ? `<tr><td style="padding: 4px 0; color: #9ca3af;">Clinic</td><td>${escape(ticket.clinic_name)}</td></tr>` : ''}
            <tr><td style="padding: 4px 0; color: #9ca3af;">Ticket ID</td><td style="font-family: monospace; font-size: 11px;">${ticket.id}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <div style="white-space: pre-wrap; color: #1f2937; font-size: 14px; line-height: 1.6;">${escape(ticket.message)}</div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Reply directly to <a href="mailto:${ticket.user_email}" style="color: #6366f1;">${ticket.user_email}</a> or open the super-admin dashboard to update ticket status.
          </p>
        </div>
      </div>`;
        await this.emailProvider.send({
            to: this.adminEmail,
            subject: `[Support · ${categoryLabel}] ${ticket.subject}`,
            body: `New support ticket from ${ticket.user_name} (${ticket.user_email}) — ${ticket.subject}\n\n${ticket.message}`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
        this.logger.log(`Support ticket admin email sent to ${this.adminEmail}`);
    }
};
exports.SupportTicketService = SupportTicketService;
exports.SupportTicketService = SupportTicketService = SupportTicketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        whatsapp_provider_js_1.WhatsAppProvider,
        email_provider_js_1.EmailProvider,
        config_1.ConfigService])
], SupportTicketService);
//# sourceMappingURL=support-ticket.service.js.map