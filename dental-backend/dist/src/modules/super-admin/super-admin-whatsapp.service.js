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
var SuperAdminWhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminWhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const META_GRAPH_API = 'https://graph.facebook.com/v21.0';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
let SuperAdminWhatsAppService = SuperAdminWhatsAppService_1 = class SuperAdminWhatsAppService {
    prisma;
    configService;
    logger = new common_1.Logger(SuperAdminWhatsAppService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    getConfig() {
        const accessToken = this.configService.get('app.whatsapp.accessToken');
        const phoneNumberId = this.configService.get('app.whatsapp.phoneNumberId');
        const wabaId = this.configService.get('app.whatsapp.wabaId');
        if (!accessToken || !phoneNumberId) {
            throw new common_1.BadRequestException('Platform WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment.');
        }
        return { accessToken, phoneNumberId, wabaId };
    }
    getStatus() {
        const accessToken = this.configService.get('app.whatsapp.accessToken');
        const phoneNumberId = this.configService.get('app.whatsapp.phoneNumberId');
        const wabaId = this.configService.get('app.whatsapp.wabaId');
        return {
            connected: !!(accessToken && phoneNumberId),
            phoneNumberId: phoneNumberId || null,
            wabaId: wabaId || null,
        };
    }
    async getConversations(page = 1, limit = 30) {
        const offset = (page - 1) * limit;
        const rows = await this.prisma.$queryRaw `
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
    async getConversationMessages(phone, page = 1, limit = 50) {
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
            this.sendReadReceipts(unreadInbound.map((m) => m.wa_message_id)).catch((err) => {
                this.logger.warn(`Platform read receipt send failed: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        return {
            data: messages,
            meta: { total, page, limit, total_pages: Math.ceil(total / limit), normalized_phone: normalizedPhone },
        };
    }
    async sendReply(phone, body) {
        const config = this.getConfig();
        const variants = this.phoneVariants(phone);
        const destination = this.normalizePhone(phone);
        const lastInbound = await this.prisma.platformMessage.findFirst({
            where: { channel: 'whatsapp', contact_phone: { in: variants }, direction: 'inbound' },
            orderBy: { created_at: 'desc' },
            select: { created_at: true },
        });
        const withinWindow = lastInbound
            ? (Date.now() - lastInbound.created_at.getTime()) < TWENTY_FOUR_HOURS_MS
            : false;
        if (!withinWindow) {
            throw new common_1.BadRequestException('Cannot send free-form message — no reply received within the last 24 hours. Use a template message instead.');
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
    async sendTemplate(params) {
        const config = this.getConfig();
        const destination = this.normalizePhone(params.phone);
        const languageCode = params.languageCode || 'en';
        const components = [];
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
    async sendToMeta(config, payload) {
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
            const data = (await response.json());
            if (response.ok && data.messages) {
                const messages = data.messages;
                return { success: true, messageId: messages[0]?.id };
            }
            const err = data.error;
            const msg = err?.['message'] || 'Meta API error';
            this.logger.warn(`Platform WhatsApp send failed: ${msg}`);
            return { success: false, error: msg };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Platform WhatsApp send exception: ${msg}`);
            return { success: false, error: msg };
        }
    }
    async sendReadReceipts(waMessageIds) {
        const config = this.getConfig();
        await Promise.all(waMessageIds.map(async (waId) => {
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
            }
            catch (err) {
                this.logger.debug(`Failed to send read receipt for ${waId}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }));
    }
    normalizePhone(phone) {
        const digits = phone.replace(/[^0-9]/g, '');
        const last10 = digits.slice(-10);
        if (digits.length === 10)
            return `91${digits}`;
        if (digits.startsWith('91') && digits.length === 12)
            return digits;
        if (digits.startsWith('0') && digits.length === 11)
            return `91${digits.slice(1)}`;
        if (last10.length === 10)
            return `91${last10}`;
        return digits;
    }
    phoneVariants(phone) {
        const digits = phone.replace(/[^0-9]/g, '');
        const last10 = digits.slice(-10);
        return [...new Set([phone, digits, last10, `91${last10}`, `+91${last10}`])].filter(Boolean);
    }
};
exports.SuperAdminWhatsAppService = SuperAdminWhatsAppService;
exports.SuperAdminWhatsAppService = SuperAdminWhatsAppService = SuperAdminWhatsAppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService])
], SuperAdminWhatsAppService);
//# sourceMappingURL=super-admin-whatsapp.service.js.map