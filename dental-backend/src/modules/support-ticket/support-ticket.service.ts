import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { WhatsAppProvider } from '../communication/providers/whatsapp.provider.js';
import { EmailProvider } from '../communication/providers/email.provider.js';
import { NotificationService } from '../notification/notification.service.js';
import { PushNotificationService } from '../notification/push-notification.service.js';
import type {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  AddTicketCommentDto,
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
    private readonly notificationService: NotificationService,
    private readonly pushNotificationService: PushNotificationService,
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
      include: { comments: { orderBy: { created_at: 'desc' }, take: 1, select: { created_at: true, author_type: true } } },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  async findOneWithComments(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { comments: { orderBy: { created_at: 'asc' } } },
    });
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

  // ---------- comments (interactive thread) ----------

  async getTicketWithComments(ticketId: string, clinicId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        comments: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    if (ticket.clinic_id !== clinicId) throw new ForbiddenException('Access denied');
    return ticket;
  }

  async addUserComment(ticketId: string, clinicId: string, userId: string, dto: AddTicketCommentDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, clinic_id: true, status: true },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    if (ticket.clinic_id !== clinicId) throw new ForbiddenException('Access denied');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const fullTicket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        subject: true,
        user_name: true,
        user_email: true,
        clinic_name: true,
      },
    });

    const comment = await this.prisma.supportTicketComment.create({
      data: {
        ticket_id: ticketId,
        author_type: 'user',
        author_id: userId,
        author_name: user?.name ?? 'User',
        message: dto.message,
      },
    });

    // Re-open a closed/resolved ticket when the user replies
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'open', resolved_at: null },
      });
    }

    if (fullTicket) {
      this.sendUserReplyAlertEmail(fullTicket, dto.message).catch((err) =>
        this.logger.warn(`Failed to email admin about user reply: ${err.message}`),
      );
    }

    return comment;
  }

  async addAdminComment(ticketId: string, adminName: string, dto: AddTicketCommentDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, clinic_id: true, user_id: true, subject: true },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');

    const comment = await this.prisma.supportTicketComment.create({
      data: {
        ticket_id: ticketId,
        author_type: 'admin',
        author_id: null,
        author_name: adminName,
        message: dto.message,
      },
    });

    // Flip ticket to in_progress if it was open
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'in_progress' },
    });

    // Notify the clinic user who submitted the ticket (in-app + mobile push)
    const notifBody = `Our team replied to: "${ticket.subject}". Tap to read.`;
    this.notificationService
      .create({
        clinic_id: ticket.clinic_id,
        user_id: ticket.user_id,
        type: 'support_reply',
        title: 'Support reply on your ticket',
        body: notifBody,
        metadata: { ticket_id: ticketId },
      })
      .then(() =>
        this.pushNotificationService.sendToUser(ticket.user_id, {
          title: 'Support reply on your ticket',
          body: notifBody,
          channelId: 'support',
          data: { ticket_id: ticketId, type: 'support_reply' },
        }),
      )
      .catch((e) => this.logger.warn(`Failed to notify user of support reply: ${(e as Error).message}`));

    return comment;
  }

  async listComments(ticketId: string) {
    return this.prisma.supportTicketComment.findMany({
      where: { ticket_id: ticketId },
      orderBy: { created_at: 'asc' },
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

  private async sendUserReplyAlertEmail(
    ticket: {
      id: string;
      subject: string;
      user_name: string;
      user_email: string;
      clinic_name: string | null;
    },
    replyMessage: string,
  ) {
    if (!this.ensureEmailConfigured()) return;

    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 16px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #fff; margin: 0; font-size: 18px;">💬 Clinic replied on support ticket</h2>
        </div>
        <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">${escape(ticket.clinic_name ?? 'Clinic')} · ${escape(ticket.user_name)}</p>
          <h3 style="margin: 0 0 12px; color: #111827;">${escape(ticket.subject)}</h3>
          <div style="white-space: pre-wrap; color: #1f2937; font-size: 14px; line-height: 1.6; background: #f9fafb; padding: 12px; border-radius: 8px;">${escape(replyMessage)}</div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Ticket ID: ${ticket.id}</p>
        </div>
      </div>`;

    await this.emailProvider.send({
      to: this.adminEmail,
      subject: `[Support reply] ${ticket.subject}`,
      body: `${ticket.user_name} replied on "${ticket.subject}":\n\n${replyMessage}`,
      html,
      clinicId: PLATFORM_CLINIC_ID,
    });
  }
}
