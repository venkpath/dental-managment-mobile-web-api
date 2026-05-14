import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { WhatsAppProvider } from '../communication/providers/whatsapp.provider.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import type {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  TicketCategory,
} from './dto/index.js';

const PLATFORM_CLINIC_ID = '__platform__';

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  billing: 'Billing Question',
  account: 'Account Issue',
  general: 'General Question',
};

interface SubmitterContext {
  userId: string;
  clinicId: string;
}

@Injectable()
export class SupportTicketService {
  private readonly logger = new Logger(SupportTicketService.name);
  private readonly adminPhone: string;
  private readonly adminEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppProvider,
    private readonly emailProvider: EmailProvider,
    private readonly config: ConfigService,
  ) {
    // Tickets route to the public support inbox + the primary support phone
    // (same numbers shown on the marketing site navbar/footer). Override via
    // SUPPORT_EMAIL / SUPPORT_WHATSAPP_PHONE env vars if needed.
    this.adminPhone = process.env.SUPPORT_WHATSAPP_PHONE || '917353230500';
    this.adminEmail = process.env.SUPPORT_EMAIL || 'support@smartdentaldesk.com';
  }

  async create(ctx: SubmitterContext, dto: CreateSupportTicketDto) {
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

    if (!user) throw new NotFoundException('User not found');

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

    // Fire-and-forget admin notifications — failure here must not block the user
    this.sendAdminAlert(ticket).catch((err) =>
      this.logger.warn(`Failed to send WhatsApp admin alert: ${err.message}`),
    );
    this.sendAdminAlertEmail(ticket).catch((err) =>
      this.logger.warn(`Failed to send admin alert email: ${err.message}`),
    );

    return ticket;
  }

  async listMine(ctx: SubmitterContext) {
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

  // ---------- super-admin ----------

  async listAll(status?: string) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  async update(id: string, dto: UpdateSupportTicketDto) {
    await this.findOne(id);
    const resolvedAt =
      dto.status === 'resolved' || dto.status === 'closed' ? new Date() : undefined;
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        admin_notes: dto.admin_notes,
        ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
      },
    });
  }

  // ---------- notifications ----------

  private ensureEmailConfigured(): boolean {
    if (this.emailProvider.isConfigured(PLATFORM_CLINIC_ID)) return true;

    const host = this.config.get<string>('app.smtp.host');
    const user = this.config.get<string>('app.smtp.user');
    if (host && user) {
      this.emailProvider.configure(
        PLATFORM_CLINIC_ID,
        {
          host,
          port: this.config.get<number>('app.smtp.port') || 587,
          user,
          pass: this.config.get<string>('app.smtp.pass') || '',
          from: this.config.get<string>('app.smtp.from') || user,
          secure: this.config.get<boolean>('app.smtp.secure') || false,
        },
        'smtp-env',
      );
      return true;
    }
    this.logger.warn('SMTP not configured — support ticket emails will be skipped');
    return false;
  }

  private ensureWhatsAppConfigured(): boolean {
    if (this.whatsapp.isConfigured(PLATFORM_CLINIC_ID)) return true;
    const accessToken = this.config.get<string>('app.whatsapp.accessToken');
    const phoneNumberId = this.config.get<string>('app.whatsapp.phoneNumberId');
    if (accessToken && phoneNumberId) {
      this.whatsapp.configure(
        PLATFORM_CLINIC_ID,
        {
          accessToken,
          phoneNumberId,
          wabaId: this.config.get<string>('app.whatsapp.wabaId') || '',
        },
        'meta-cloud-env',
      );
      return true;
    }
    this.logger.warn('WhatsApp not configured — support ticket admin alert skipped');
    return false;
  }

  private async sendAdminAlert(ticket: {
    user_name: string;
    user_phone: string | null;
    clinic_name: string | null;
    category: string;
    subject: string;
  }) {
    if (!this.ensureWhatsAppConfigured()) return;
    return this.whatsapp.send({
      to: this.adminPhone,
      body: `New support ticket from ${ticket.user_name} (${ticket.clinic_name ?? 'unknown clinic'}): [${ticket.category}] ${ticket.subject}`,
      clinicId: PLATFORM_CLINIC_ID,
    });
  }

  private async sendAdminAlertEmail(ticket: {
    id: string;
    user_name: string;
    user_email: string;
    user_phone: string | null;
    clinic_name: string | null;
    category: string;
    subject: string;
    message: string;
    created_at: Date;
  }) {
    if (!this.ensureEmailConfigured()) return;

    const categoryLabel = CATEGORY_LABELS[ticket.category as TicketCategory] ?? ticket.category;
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
}
