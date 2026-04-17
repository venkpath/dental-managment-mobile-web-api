import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { WhatsAppProvider } from '../communication/providers/whatsapp.provider.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import type { CreateDemoRequestDto, UpdateDemoStatusDto } from './dto/demo-request.dto.js';

/** Synthetic clinic ID used to configure the platform-level SMTP transporter */
const PLATFORM_CLINIC_ID = '__platform__';

@Injectable()
export class DemoRequestService {
  private readonly logger = new Logger(DemoRequestService.name);
  private readonly adminPhone: string;
  private readonly adminEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppProvider,
    private readonly emailProvider: EmailProvider,
    private readonly config: ConfigService,
  ) {
    this.adminPhone = this.config.get<string>('app.adminWhatsappPhone', '916366767512');
    this.adminEmail = this.config.get<string>('app.adminEmail', 'prasanthshanmugam10@gmail.com');
  }

  /** Ensure platform SMTP transporter is configured (same pattern as auth.service.ts) */
  private ensureEmailConfigured(): boolean {
    if (this.emailProvider.isConfigured(PLATFORM_CLINIC_ID)) return true;

    const host = this.config.get<string>('app.smtp.host');
    const user = this.config.get<string>('app.smtp.user');
    if (host && user) {
      this.emailProvider.configure(PLATFORM_CLINIC_ID, {
        host,
        port: this.config.get<number>('app.smtp.port') || 587,
        user,
        pass: this.config.get<string>('app.smtp.pass') || '',
        from: this.config.get<string>('app.smtp.from') || user,
        secure: this.config.get<boolean>('app.smtp.secure') || false,
      }, 'smtp-env');
      return true;
    }

    this.logger.warn('SMTP not configured — demo request emails will be skipped');
    return false;
  }

  async create(dto: CreateDemoRequestDto) {
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

    // Fire-and-forget WhatsApp notifications
    this.sendConfirmationToProspect(demo.phone, demo.name).catch((err) =>
      this.logger.warn(`Failed to send prospect confirmation: ${err.message}`),
    );
    this.sendAdminAlert(demo).catch((err) =>
      this.logger.warn(`Failed to send admin alert: ${err.message}`),
    );

    // Fire-and-forget email notifications
    this.sendConfirmationEmail(demo).catch((err) =>
      this.logger.warn(`Failed to send prospect email: ${err.message}`),
    );
    this.sendAdminAlertEmail(demo).catch((err) =>
      this.logger.warn(`Failed to send admin alert email: ${err.message}`),
    );

    return demo;
  }

  async findAll(status?: string) {
    return this.prisma.demoRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const demo = await this.prisma.demoRequest.findUnique({ where: { id } });
    if (!demo) throw new NotFoundException('Demo request not found');
    return demo;
  }

  async updateStatus(id: string, dto: UpdateDemoStatusDto) {
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

    // If status is 'scheduled' and we have a date + link, send confirmation
    if (dto.status === 'scheduled' && updated.scheduled_at && updated.meeting_link) {
      this.sendScheduledConfirmation(updated).catch((err) =>
        this.logger.warn(`Failed to send scheduled confirmation: ${err.message}`),
      );
      this.sendScheduledEmail(updated).catch((err) =>
        this.logger.warn(`Failed to send scheduled email: ${err.message}`),
      );
    }

    return updated;
  }

  // ── Template 1: Confirmation to the person who booked ──
  private async sendConfirmationToProspect(phone: string, name: string) {
    const to = phone.startsWith('91') ? phone : `91${phone}`;
    return this.whatsapp.send({
      to,
      body: `Hi ${name}, thank you for showing interest in Smart Dental Desk!`,
      templateId: 'demo_request_confirmation',
      variables: { '1': name },
      language: 'en',
    });
  }

  // ── Template 2: Alert to the sales/admin team ──
  private async sendAdminAlert(demo: {
    name: string;
    phone: string;
    clinic_name: string | null;
    chairs: string | null;
  }) {
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
    });
  }

  // ── Template 3: Scheduled confirmation to the prospect ──
  private async sendScheduledConfirmation(demo: {
    phone: string;
    name: string;
    scheduled_at: Date | null;
    meeting_link: string | null;
  }) {
    if (!demo.scheduled_at || !demo.meeting_link) return;

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
    });
  }

  // ── Email 1: Confirmation email to the prospect ──
  private async sendConfirmationEmail(demo: {
    name: string;
    email: string;
    clinic_name: string | null;
  }) {
    if (!this.ensureEmailConfigured()) return;

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

  // ── Email 2: Alert email to admin ──
  private async sendAdminAlertEmail(demo: {
    name: string;
    email: string;
    phone: string;
    clinic_name: string | null;
    chairs: string | null;
    source: string | null;
    created_at: Date;
  }) {
    if (!this.ensureEmailConfigured()) return;

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

  // ── Email 3: Scheduled confirmation email to the prospect ──
  private async sendScheduledEmail(demo: {
    email: string;
    name: string;
    scheduled_at: Date | null;
    meeting_link: string | null;
  }) {
    if (!this.ensureEmailConfigured() || !demo.scheduled_at || !demo.meeting_link) return;

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
}
