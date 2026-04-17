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
var DemoRequestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoRequestService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const whatsapp_provider_js_1 = require("../communication/providers/whatsapp.provider.js");
const email_provider_js_1 = require("../communication/providers/email.provider.js");
const PLATFORM_CLINIC_ID = '__platform__';
let DemoRequestService = DemoRequestService_1 = class DemoRequestService {
    prisma;
    whatsapp;
    emailProvider;
    config;
    logger = new common_1.Logger(DemoRequestService_1.name);
    adminPhone;
    adminEmail;
    constructor(prisma, whatsapp, emailProvider, config) {
        this.prisma = prisma;
        this.whatsapp = whatsapp;
        this.emailProvider = emailProvider;
        this.config = config;
        this.adminPhone = this.config.get('app.adminWhatsappPhone', '916366767512');
        this.adminEmail = this.config.get('app.adminEmail', 'prasanthshanmugam10@gmail.com');
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
        this.logger.warn('SMTP not configured — demo request emails will be skipped');
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
        this.logger.warn('WhatsApp not configured — demo request WhatsApp messages will be skipped');
        return false;
    }
    async create(dto) {
        const demo = await this.prisma.demoRequest.create({
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                clinic_name: dto.clinicName,
                chairs: dto.chairs,
                source: dto.source || 'website',
            },
        });
        this.sendConfirmationToProspect(demo.phone, demo.name).catch((err) => this.logger.warn(`Failed to send prospect confirmation: ${err.message}`));
        this.sendAdminAlert(demo).catch((err) => this.logger.warn(`Failed to send admin alert: ${err.message}`));
        this.sendConfirmationEmail(demo).catch((err) => this.logger.warn(`Failed to send prospect email: ${err.message}`));
        this.sendAdminAlertEmail(demo).catch((err) => this.logger.warn(`Failed to send admin alert email: ${err.message}`));
        return demo;
    }
    async findAll(status) {
        return this.prisma.demoRequest.findMany({
            where: status ? { status } : undefined,
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(id) {
        const demo = await this.prisma.demoRequest.findUnique({ where: { id } });
        if (!demo)
            throw new common_1.NotFoundException('Demo request not found');
        return demo;
    }
    async updateStatus(id, dto) {
        const demo = await this.findOne(id);
        const updated = await this.prisma.demoRequest.update({
            where: { id },
            data: {
                status: dto.status,
                notes: dto.notes ?? demo.notes,
                scheduled_at: dto.scheduledAt ? new Date(dto.scheduledAt) : demo.scheduled_at,
                meeting_link: dto.meetingLink ?? demo.meeting_link,
            },
        });
        if (dto.status === 'scheduled' && updated.scheduled_at && updated.meeting_link) {
            this.sendScheduledConfirmation(updated).catch((err) => this.logger.warn(`Failed to send scheduled confirmation: ${err.message}`));
            this.sendScheduledEmail(updated).catch((err) => this.logger.warn(`Failed to send scheduled email: ${err.message}`));
        }
        return updated;
    }
    async sendConfirmationToProspect(phone, name) {
        if (!this.ensureWhatsAppConfigured())
            return;
        const to = phone.startsWith('91') ? phone : `91${phone}`;
        return this.whatsapp.send({
            to,
            body: `Hi ${name}, thank you for showing interest in Smart Dental Desk!`,
            templateId: 'demo_request_confirmation',
            variables: { '1': name },
            language: 'en',
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async sendAdminAlert(demo) {
        if (!this.ensureWhatsAppConfigured())
            return;
        return this.whatsapp.send({
            to: this.adminPhone,
            body: `New demo request: ${demo.name} — ${demo.phone}`,
            templateId: 'demo_request_admin_alert',
            variables: {
                '1': demo.name,
                '2': demo.phone,
                '3': demo.clinic_name || 'Not specified',
                '4': demo.chairs || 'Not specified',
            },
            language: 'en',
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async sendScheduledConfirmation(demo) {
        if (!demo.scheduled_at || !demo.meeting_link)
            return;
        if (!this.ensureWhatsAppConfigured())
            return;
        const to = demo.phone.startsWith('91') ? demo.phone : `91${demo.phone}`;
        const date = demo.scheduled_at.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const time = demo.scheduled_at.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
        return this.whatsapp.send({
            to,
            body: `Hi ${demo.name}, your demo is scheduled for ${date} at ${time}.`,
            templateId: 'demo_scheduled_confirmation',
            variables: {
                '1': demo.name,
                '2': date,
                '3': time,
                '4': demo.meeting_link,
            },
            language: 'en',
            clinicId: PLATFORM_CLINIC_ID,
        });
    }
    async sendConfirmationEmail(demo) {
        if (!this.ensureEmailConfigured())
            return;
        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Smart Dental Desk</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${demo.name},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for showing interest in <strong>Smart Dental Desk</strong>! We've received your demo request
            ${demo.clinic_name ? `for <strong>${demo.clinic_name}</strong>` : ''} and our team will be in touch within 2 hours.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            In the meantime, here's what you can expect from the demo:
          </p>
          <ul style="color: #4b5563; line-height: 1.8;">
            <li>A personalized walkthrough of all features</li>
            <li>How Smart Dental Desk fits your clinic's workflow</li>
            <li>Pricing and plan recommendations</li>
            <li>Answers to all your questions</li>
          </ul>
          <p style="color: #4b5563; line-height: 1.6;">
            If you have any immediate questions, feel free to reply to this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Smart Dental Desk — Modern dental practice management<br/>
            <a href="https://smartdentaldesk.com" style="color: #6366f1;">smartdentaldesk.com</a>
          </p>
        </div>
      </div>`;
        await this.emailProvider.send({
            to: demo.email,
            subject: 'Your Demo Request is Confirmed — Smart Dental Desk',
            body: `Hi ${demo.name}, thank you for showing interest in Smart Dental Desk! We've received your demo request and our team will be in touch within 2 hours.`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
        this.logger.log(`Confirmation email sent to ${demo.email}`);
    }
    async sendAdminAlertEmail(demo) {
        if (!this.ensureEmailConfigured())
            return;
        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 20px 32px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #fff; margin: 0;">🚨 New Demo Request</h2>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 130px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${demo.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0;"><a href="mailto:${demo.email}">${demo.email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Phone</td><td style="padding: 8px 0;"><a href="tel:${demo.phone}">${demo.phone}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Clinic Name</td><td style="padding: 8px 0;">${demo.clinic_name || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Chairs</td><td style="padding: 8px 0;">${demo.chairs || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Source</td><td style="padding: 8px 0;">${demo.source || 'website'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Submitted</td><td style="padding: 8px 0;">${demo.created_at.toLocaleString('en-IN')}</td></tr>
          </table>
          <div style="margin-top: 24px; text-align: center;">
            <a href="https://smartdentaldesk.com/super-admin/demo-requests" style="background: #6366f1; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Dashboard</a>
          </div>
        </div>
      </div>`;
        await this.emailProvider.send({
            to: this.adminEmail,
            subject: `New Demo Request: ${demo.name} — ${demo.clinic_name || 'No Clinic'}`,
            body: `New demo request from ${demo.name} (${demo.email}, ${demo.phone}). Clinic: ${demo.clinic_name || 'Not specified'}. Chairs: ${demo.chairs || 'Not specified'}.`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
        this.logger.log(`Admin alert email sent to ${this.adminEmail}`);
    }
    async sendScheduledEmail(demo) {
        if (!this.ensureEmailConfigured() || !demo.scheduled_at || !demo.meeting_link)
            return;
        const date = demo.scheduled_at.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const time = demo.scheduled_at.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Smart Dental Desk</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1f2937; margin-top: 0;">Your Demo is Scheduled! 🎉</h2>
          <p style="color: #4b5563; line-height: 1.6;">Hi ${demo.name},</p>
          <p style="color: #4b5563; line-height: 1.6;">
            Your personalized demo has been scheduled. Here are the details:
          </p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #1f2937;"><strong>📅 Date:</strong> ${date}</p>
            <p style="margin: 4px 0; color: #1f2937;"><strong>🕐 Time:</strong> ${time}</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${demo.meeting_link}" style="background: #0ea5e9; color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Join Meeting</a>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Please make sure you have a stable internet connection. We look forward to showing you how Smart Dental Desk can transform your practice!
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Smart Dental Desk — Modern dental practice management<br/>
            <a href="https://smartdentaldesk.com" style="color: #6366f1;">smartdentaldesk.com</a>
          </p>
        </div>
      </div>`;
        await this.emailProvider.send({
            to: demo.email,
            subject: `Your Demo is Scheduled — ${date} at ${time}`,
            body: `Hi ${demo.name}, your demo is scheduled for ${date} at ${time}. Join here: ${demo.meeting_link}`,
            html,
            clinicId: PLATFORM_CLINIC_ID,
        });
        this.logger.log(`Scheduled confirmation email sent to ${demo.email}`);
    }
};
exports.DemoRequestService = DemoRequestService;
exports.DemoRequestService = DemoRequestService = DemoRequestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        whatsapp_provider_js_1.WhatsAppProvider,
        email_provider_js_1.EmailProvider,
        config_1.ConfigService])
], DemoRequestService);
//# sourceMappingURL=demo-request.service.js.map