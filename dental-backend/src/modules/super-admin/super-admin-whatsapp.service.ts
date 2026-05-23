import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface PlatformWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
}

@Injectable()
export class SuperAdminWhatsAppService {
  private readonly logger = new Logger(SuperAdminWhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getConfig(): PlatformWhatsAppConfig {
    const accessToken = this.configService.get<string>('app.whatsapp.accessToken');
    const phoneNumberId = this.configService.get<string>('app.whatsapp.phoneNumberId');
    const wabaId = this.configService.get<string>('app.whatsapp.wabaId');

    if (!accessToken || !phoneNumberId) {
      throw new BadRequestException(
        'Platform WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment.',
      );
    }

    return { accessToken, phoneNumberId, wabaId };
  }

  /** Check platform WhatsApp status for the super admin connection header */
  getStatus() {
    const accessToken = this.configService.get<string>('app.whatsapp.accessToken');
    const phoneNumberId = this.configService.get<string>('app.whatsapp.phoneNumberId');
    const wabaId = this.configService.get<string>('app.whatsapp.wabaId');

    return {
      connected: !!(accessToken && phoneNumberId),
      phoneNumberId: phoneNumberId || null,
      wabaId: wabaId || null,
    };
  }

  /** List conversations grouped by contact phone (latest message per contact). */
  async getConversations(page = 1, limit = 30) {
    const offset = (page - 1) * limit;

    const rows = await this.prisma.$queryRaw<Array<{
      contact_phone: string;
      contact_name: string | null;
      last_body: string;
      last_at: Date;
      last_direction: string;
      last_status: string;
      unread_count: bigint;
      last_inbound_at: Date | null;
      total: bigint;
    }>>`
      WITH ranked AS (
        SELECT
          m.contact_phone,
          m.contact_name,
          m.body,
          m.direction,
          m.status,
          m.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY m.contact_phone
            ORDER BY m.created_at DESC
          ) AS rn
        FROM platform_messages m
        WHERE m.channel = 'whatsapp'
      ),
      conversations AS (
        SELECT
          r.contact_phone,
          r.contact_name,
          r.body AS last_body,
          r.created_at AS last_at,
          r.direction AS last_direction,
          r.status AS last_status,
          (SELECT COUNT(*) FROM ranked u WHERE u.contact_phone = r.contact_phone AND u.direction = 'inbound' AND u.status != 'read') AS unread_count,
          (SELECT MAX(u.created_at) FROM ranked u WHERE u.contact_phone = r.contact_phone AND u.direction = 'inbound') AS last_inbound_at
        FROM ranked r
        WHERE r.rn = 1
      )
      SELECT c.*, COUNT(*) OVER () AS total
      FROM conversations c
      ORDER BY c.last_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = rows[0] ? Number(rows[0].total) : 0;

    return {
      data: rows.map((r) => ({
        phone: r.contact_phone,
        contact_name: r.contact_name ?? r.contact_phone,
        last_message: r.last_body,
        last_at: r.last_at,
        last_direction: r.last_direction,
        last_status: r.last_status,
        last_inbound_at: r.last_inbound_at,
        unread_count: Number(r.unread_count),
      })),
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  /** Get all messages in a single conversation thread. */
  async getConversationMessages(phone: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const normalizedPhone = this.normalizePhone(phone);
    const variants = this.phoneVariants(phone);

    const [messages, total] = await Promise.all([
      this.prisma.platformMessage.findMany({
        where: { channel: 'whatsapp', contact_phone: { in: variants } },
        orderBy: { created_at: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.platformMessage.count({
        where: { channel: 'whatsapp', contact_phone: { in: variants } },
      }),
    ]);

    // Mark inbound messages as read + send read receipts to Meta
    const unreadInbound = await this.prisma.platformMessage.findMany({
      where: {
        channel: 'whatsapp',
        contact_phone: { in: variants },
        direction: 'inbound',
        status: { not: 'read' },
        wa_message_id: { not: null },
      },
      select: { id: true, wa_message_id: true },
    });

    if (unreadInbound.length > 0) {
      await this.prisma.platformMessage.updateMany({
        where: { id: { in: unreadInbound.map((m) => m.id) } },
        data: { status: 'read' },
      });

      this.sendReadReceipts(unreadInbound.map((m) => m.wa_message_id!)).catch((err) => {
        this.logger.warn(`Platform read receipt send failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }

    return {
      data: messages,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit), normalized_phone: normalizedPhone },
    };
  }

  /** Send a free-form reply within 24hr session window. */
  async sendReply(phone: string, body: string) {
    const config = this.getConfig();
    const variants = this.phoneVariants(phone);
    const destination = this.normalizePhone(phone);

    // Must have had an inbound message within 24 hours
    const lastInbound = await this.prisma.platformMessage.findFirst({
      where: { channel: 'whatsapp', contact_phone: { in: variants }, direction: 'inbound' },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    const withinWindow = lastInbound
      ? (Date.now() - lastInbound.created_at.getTime()) < TWENTY_FOUR_HOURS_MS
      : false;

    if (!withinWindow) {
      throw new BadRequestException(
        'Cannot send free-form message — no reply received within the last 24 hours. Use a template message instead.',
      );
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: destination,
      type: 'text',
      text: { body },
    };

    const result = await this.sendToMeta(config, payload);

    const message = await this.prisma.platformMessage.create({
      data: {
        direction: 'outbound',
        channel: 'whatsapp',
        from_phone: config.phoneNumberId,
        to_phone: destination,
        contact_phone: destination,
        body,
        message_type: 'text',
        status: result.success ? 'sent' : 'failed',
        wa_message_id: result.messageId ?? null,
        sent_at: new Date(),
        metadata: result.success ? undefined : { error: result.error },
      },
    });

    return { success: result.success, message_id: message.id, error: result.error };
  }

  /** Upload a media file to Meta and send it as a document/image message within the 24hr session window. */
  async sendMedia(params: {
    phone: string;
    file: { buffer: Buffer; mimetype: string; originalname: string };
    caption?: string;
  }) {
    const config = this.getConfig();
    const variants = this.phoneVariants(params.phone);
    const destination = this.normalizePhone(params.phone);

    const lastInbound = await this.prisma.platformMessage.findFirst({
      where: { channel: 'whatsapp', contact_phone: { in: variants }, direction: 'inbound' },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    const withinWindow = lastInbound
      ? (Date.now() - lastInbound.created_at.getTime()) < TWENTY_FOUR_HOURS_MS
      : false;

    if (!withinWindow) {
      throw new BadRequestException(
        'Cannot send attachment — no reply received within the last 24 hours. Use a template message instead.',
      );
    }

    // 1. Upload media to Meta
    const mediaId = await this.uploadMediaToMeta(config, params.file);
    if (!mediaId) {
      return { success: false, message_id: '', error: 'Failed to upload media to Meta' };
    }

    // 2. Decide WhatsApp message type based on mime type
    const mime = params.file.mimetype || 'application/octet-stream';
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');
    const wamType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document';

    const mediaObj: Record<string, unknown> = { id: mediaId };
    if (params.caption && (isImage || isVideo || wamType === 'document')) {
      mediaObj['caption'] = params.caption;
    }
    if (wamType === 'document') {
      mediaObj['filename'] = params.file.originalname;
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: destination,
      type: wamType,
      [wamType]: mediaObj,
    };

    const result = await this.sendToMeta(config, payload);
    const body = params.caption || `[${wamType}: ${params.file.originalname}]`;

    const message = await this.prisma.platformMessage.create({
      data: {
        direction: 'outbound',
        channel: 'whatsapp',
        from_phone: config.phoneNumberId,
        to_phone: destination,
        contact_phone: destination,
        body,
        message_type: wamType,
        status: result.success ? 'sent' : 'failed',
        wa_message_id: result.messageId ?? null,
        sent_at: new Date(),
        metadata: {
          type: wamType,
          media_id: mediaId,
          mime_type: mime,
          filename: params.file.originalname,
          ...(result.success ? {} : { error: result.error }),
        },
      },
    });

    return { success: result.success, message_id: message.id, error: result.error };
  }

  /** Fetch a signed temporary URL for an inbound media item by media ID. */
  async getMediaUrl(mediaId: string) {
    const config = this.getConfig();
    try {
      const metaRes = await fetch(`${META_GRAPH_API}/${mediaId}`, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });
      const data = (await metaRes.json()) as Record<string, unknown>;
      if (!metaRes.ok || !data.url) {
        const err = data.error as Record<string, unknown> | undefined;
        throw new BadRequestException((err?.['message'] as string) || 'Failed to fetch media URL');
      }
      // Meta media URLs require the access token to download — proxy the bytes instead.
      const binRes = await fetch(data.url as string, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });
      if (!binRes.ok) throw new BadRequestException('Failed to download media bytes');
      const arrayBuf = await binRes.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuf),
        mimeType: (data.mime_type as string) || 'application/octet-stream',
        fileName: (data.file_name as string) || `media-${mediaId}`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`getMediaUrl failed for ${mediaId}: ${msg}`);
      throw new BadRequestException(msg);
    }
  }

  /** Upload binary to Meta /PHONE_NUMBER_ID/media; returns media_id. */
  private async uploadMediaToMeta(
    config: PlatformWhatsAppConfig,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<string | null> {
    try {
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', file.mimetype);
      const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
      form.append('file', blob, file.originalname);

      const res = await fetch(`${META_GRAPH_API}/${config.phoneNumberId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.accessToken}` },
        body: form,
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !data.id) {
        const err = data.error as Record<string, unknown> | undefined;
        this.logger.warn(`Meta media upload failed: ${(err?.['message'] as string) || 'unknown'}`);
        return null;
      }
      return data.id as string;
    } catch (error) {
      this.logger.error(`Meta media upload exception: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /** Send a template message to start a new conversation. */
  async sendTemplate(params: {
    phone: string;
    templateName: string;
    languageCode?: string;
    bodyParams?: string[];
    contactName?: string;
  }) {
    const config = this.getConfig();
    const destination = this.normalizePhone(params.phone);
    const languageCode = params.languageCode || 'en';

    const components: Array<Record<string, unknown>> = [];
    if (params.bodyParams && params.bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: params.bodyParams.map((text) => ({ type: 'text', text })),
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: destination,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: languageCode },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    const result = await this.sendToMeta(config, payload);

    const body = params.bodyParams?.join(' | ') || `[template: ${params.templateName}]`;
    const message = await this.prisma.platformMessage.create({
      data: {
        direction: 'outbound',
        channel: 'whatsapp',
        from_phone: config.phoneNumberId,
        to_phone: destination,
        contact_phone: destination,
        contact_name: params.contactName ?? null,
        body,
        message_type: 'template',
        status: result.success ? 'sent' : 'failed',
        wa_message_id: result.messageId ?? null,
        template_name: params.templateName,
        sent_at: new Date(),
        metadata: result.success ? undefined : { error: result.error },
      },
    });

    return { success: result.success, message_id: message.id, error: result.error };
  }

  // ─── Helpers ───

  private async sendToMeta(
    config: PlatformWhatsAppConfig,
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `${META_GRAPH_API}/${config.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as Record<string, unknown>;

      if (response.ok && data.messages) {
        const messages = data.messages as Array<{ id: string }>;
        return { success: true, messageId: messages[0]?.id };
      }

      const err = data.error as Record<string, unknown> | undefined;
      const msg = (err?.['message'] as string) || 'Meta API error';
      this.logger.warn(`Platform WhatsApp send failed: ${msg}`);
      return { success: false, error: msg };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Platform WhatsApp send exception: ${msg}`);
      return { success: false, error: msg };
    }
  }

  private async sendReadReceipts(waMessageIds: string[]): Promise<void> {
    const config = this.getConfig();
    await Promise.all(
      waMessageIds.map(async (waId) => {
        try {
          const url = `${META_GRAPH_API}/${config.phoneNumberId}/messages`;
          await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: waId }),
          });
        } catch (err) {
          this.logger.debug(`Failed to send read receipt for ${waId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }),
    );
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, '');
    const last10 = digits.slice(-10);
    if (digits.length === 10) return `91${digits}`;
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
    if (last10.length === 10) return `91${last10}`;
    return digits;
  }

  private phoneVariants(phone: string): string[] {
    const digits = phone.replace(/[^0-9]/g, '');
    const last10 = digits.slice(-10);
    return [...new Set([phone, digits, last10, `91${last10}`, `+91${last10}`])].filter(Boolean);
  }
}
