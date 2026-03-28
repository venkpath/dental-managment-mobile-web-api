import { Injectable, Logger } from '@nestjs/common';
import type {
  ChannelProvider,
  SendMessageOptions,
  SendResult,
} from './channel-provider.interface.js';

export interface WhatsAppProviderConfig {
  /** Meta WhatsApp Cloud API — permanent access token */
  accessToken: string;
  /** Phone Number ID from Meta developer dashboard */
  phoneNumberId: string;
  /** WhatsApp Business Account ID (optional, used for template management) */
  wabaId?: string;
}

export interface WhatsAppInteractiveButton {
  type: 'reply' | 'url';
  title: string;
  id?: string;     // for reply buttons
  url?: string;     // for url buttons
}

export interface WhatsAppMediaOptions {
  type: 'image' | 'document' | 'video' | 'audio' | 'location';
  url?: string;
  caption?: string;
  filename?: string;
  latitude?: number;
  longitude?: number;
  name?: string;    // location name
  address?: string; // location address
}

interface ClinicWhatsAppContext {
  config: WhatsAppProviderConfig;
  providerName: string;
  /** Tracks session windows: phone → last_incoming_timestamp */
  sessionWindows: Map<string, number>;
}

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

@Injectable()
export class WhatsAppProvider implements ChannelProvider {
  readonly channel = 'whatsapp' as const;
  private readonly logger = new Logger(WhatsAppProvider.name);
  /** Per-clinic WhatsApp configs */
  private readonly clinicConfigs = new Map<string, ClinicWhatsAppContext>();

  configure(clinicId: string, config: WhatsAppProviderConfig, providerName: string): void {
    const existing = this.clinicConfigs.get(clinicId);
    this.clinicConfigs.set(clinicId, {
      config,
      providerName,
      sessionWindows: existing?.sessionWindows || new Map(),
    });
    this.logger.log(`WhatsApp provider configured for clinic ${clinicId}: ${providerName} (Meta Cloud API)`);
  }

  getProviderName(clinicId: string): string {
    return this.clinicConfigs.get(clinicId)?.providerName || 'disabled';
  }

  isConfigured(clinicId: string): boolean {
    return this.clinicConfigs.has(clinicId);
  }

  removeClinic(clinicId: string): void {
    this.clinicConfigs.delete(clinicId);
  }

  /** Track an incoming message — opens 24hr session window for free-form messaging */
  trackIncomingMessage(clinicId: string, phone: string): void {
    const ctx = this.clinicConfigs.get(clinicId);
    if (ctx) {
      ctx.sessionWindows.set(phone, Date.now());
    }
  }

  /** Check if a 24hr session window is open for a phone number */
  isSessionOpen(clinicId: string, phone: string): boolean {
    const ctx = this.clinicConfigs.get(clinicId);
    if (!ctx) return false;
    const lastMessage = ctx.sessionWindows.get(phone);
    if (!lastMessage) return false;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    return (Date.now() - lastMessage) < TWENTY_FOUR_HOURS;
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    const clinicId = options.clinicId || '';
    const ctx = this.clinicConfigs.get(clinicId);

    if (!ctx) {
      this.logger.warn(`WhatsApp provider not configured for clinic ${clinicId} — message not sent`);
      return {
        success: false,
        error: 'WhatsApp provider not configured. Enable WhatsApp in clinic communication settings and provide Meta API credentials.',
      };
    }

    try {
      const { config } = ctx;
      const destination = options.to.replace(/[^0-9]/g, '');

      // Determine message type based on options
      const interactiveButtons = options.metadata?.['interactive_buttons'] as WhatsAppInteractiveButton[] | undefined;
      const mediaOptions = options.metadata?.['media'] as WhatsAppMediaOptions | undefined;

      let messagePayload: Record<string, unknown>;

      if (mediaOptions) {
        messagePayload = this.buildMediaPayload(destination, mediaOptions, options.body);
      } else if (interactiveButtons && interactiveButtons.length > 0) {
        messagePayload = this.buildInteractivePayload(destination, options.body, interactiveButtons);
      } else if (options.templateId) {
        messagePayload = this.buildTemplatePayload(destination, options.templateId, options.variables, options.language);
      } else {
        // Session/Text Message — check if session window is open
        const sessionOpen = this.isSessionOpen(clinicId, destination);
        if (!sessionOpen) {
          this.logger.warn(`WhatsApp session expired for ${destination}. Use a template message or wait for patient to respond.`);
        }
        messagePayload = this.buildTextPayload(destination, options.body);
      }

      this.logger.debug(`[WhatsApp Meta] Sending to ${destination}: ${JSON.stringify(messagePayload).substring(0, 500)}`);

      const url = `${META_GRAPH_API}/${config.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const data = await response.json() as Record<string, unknown>;
      this.logger.debug(`[WhatsApp Meta] Response (${response.status}): ${JSON.stringify(data).substring(0, 300)}`);

      if (response.ok && data.messages) {
        const messages = data.messages as Array<{ id: string }>;
        const msgId = messages[0]?.id || '';
        this.logger.log(`WhatsApp sent to ${destination}: ${msgId}`);
        return { success: true, providerMessageId: msgId };
      } else {
        const error = data.error as Record<string, unknown> | undefined;
        const errorMsg = (error?.message || 'Meta API error') as string;
        this.logger.warn(`WhatsApp send failed to ${destination}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown WhatsApp error';
      this.logger.error(`WhatsApp send failed to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }

  // ─── Template Management (Meta Cloud API) ───

  async submitTemplate(clinicId: string, templateData: {
    elementName: string;
    languageCode: string;
    category: string;
    templateType: string;
    body: string;
    header?: string;
    footer?: string;
    buttons?: WhatsAppInteractiveButton[];
  }): Promise<{ success: boolean; templateId?: string; error?: string }> {
    const ctx = this.clinicConfigs.get(clinicId);
    if (!ctx) {
      return { success: false, error: 'WhatsApp not configured for this clinic' };
    }

    const { config } = ctx;
    if (!config.wabaId) {
      return { success: false, error: 'WABA ID is required for template management. Set it in your WhatsApp config.' };
    }

    try {
      const components: Array<Record<string, unknown>> = [];

      if (templateData.header) {
        components.push({ type: 'HEADER', format: 'TEXT', text: templateData.header });
      }
      components.push({ type: 'BODY', text: templateData.body });
      if (templateData.footer) {
        components.push({ type: 'FOOTER', text: templateData.footer });
      }

      const response = await fetch(`${META_GRAPH_API}/${config.wabaId}/message_templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateData.elementName,
          language: templateData.languageCode,
          category: templateData.category.toUpperCase(),
          components,
        }),
      });

      const data = await response.json() as Record<string, unknown>;

      if (response.ok && data.id) {
        return { success: true, templateId: data.id as string };
      }

      const error = data.error as Record<string, unknown> | undefined;
      return { success: false, error: (error?.message || 'Template submission failed') as string };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Fetch ALL message templates from Meta Cloud API for a WABA.
   * Paginates through results automatically.
   */
  async fetchAllTemplates(clinicId: string): Promise<{
    success: boolean;
    templates?: Array<{
      name: string;
      language: string;
      status: string;
      category: string;
      components: Array<Record<string, unknown>>;
      id: string;
      rejectedReason?: string;
    }>;
    error?: string;
  }> {
    const ctx = this.clinicConfigs.get(clinicId);
    if (!ctx) return { success: false, error: 'WhatsApp not configured for this clinic' };

    const { config } = ctx;
    if (!config.wabaId) return { success: false, error: 'WABA ID is required for template management' };

    try {
      const allTemplates: Array<{
        name: string;
        language: string;
        status: string;
        category: string;
        components: Array<Record<string, unknown>>;
        id: string;
        rejectedReason?: string;
      }> = [];

      let url: string | null = `${META_GRAPH_API}/${config.wabaId}/message_templates?limit=100&fields=name,language,status,category,components,rejected_reason`;

      while (url) {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${config.accessToken}` },
        });

        const data = await response.json() as Record<string, unknown>;

        if (!response.ok) {
          const error = data.error as Record<string, unknown> | undefined;
          return { success: false, error: (error?.message || 'Failed to fetch templates') as string };
        }

        const templates = (data.data || []) as Array<Record<string, unknown>>;
        for (const t of templates) {
          allTemplates.push({
            name: t.name as string,
            language: (t.language as string) || 'en',
            status: (t.status as string) || 'unknown',
            category: (t.category as string) || 'UTILITY',
            components: (t.components as Array<Record<string, unknown>>) || [],
            id: t.id as string,
            rejectedReason: t.rejected_reason as string | undefined,
          });
        }

        // Handle pagination
        const paging = data.paging as Record<string, unknown> | undefined;
        url = (paging?.next as string) || null;
      }

      this.logger.log(`Fetched ${allTemplates.length} WhatsApp templates for clinic ${clinicId}`);
      return { success: true, templates: allTemplates };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getTemplateStatus(clinicId: string, templateName: string): Promise<{
    status: string;
    rejectedReason?: string;
  }> {
    const ctx = this.clinicConfigs.get(clinicId);
    if (!ctx) return { status: 'not_configured' };

    const { config } = ctx;
    if (!config.wabaId) return { status: 'waba_id_required' };

    try {
      const response = await fetch(
        `${META_GRAPH_API}/${config.wabaId}/message_templates?name=${encodeURIComponent(templateName)}`,
        {
          headers: { 'Authorization': `Bearer ${config.accessToken}` },
        },
      );

      const data = await response.json() as Record<string, unknown>;
      const templates = (data.data || []) as Array<Record<string, unknown>>;
      const template = templates.find(t => t.name === templateName);

      if (!template) return { status: 'not_found' };

      return {
        status: (template.status as string) || 'unknown',
        rejectedReason: template.rejected_reason as string | undefined,
      };
    } catch {
      return { status: 'error' };
    }
  }

  // ─── Private Payload Builders (Meta Cloud API format) ───

  private buildTextPayload(destination: string, body: string): Record<string, unknown> {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: destination,
      type: 'text',
      text: { preview_url: false, body },
    };
  }

  private buildTemplatePayload(
    destination: string,
    templateName: string,
    variables?: Record<string, string>,
    language?: string,
  ): Record<string, unknown> {
    const components: Array<Record<string, unknown>> = [];

    if (variables && Object.keys(variables).length > 0) {
      // Sort by numeric key to guarantee order: "0","1","2",...
      const sortedValues = Object.entries(variables)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, value]) => value);

      components.push({
        type: 'body',
        parameters: sortedValues.map(value => ({
          type: 'text',
          text: value,
        })),
      });
    }

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: destination,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language || 'en' },
        components: components.length > 0 ? components : undefined,
      },
    };
  }

  private buildInteractivePayload(
    destination: string,
    body: string,
    buttons: WhatsAppInteractiveButton[],
  ): Record<string, unknown> {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: destination,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((btn, idx) => ({
            type: 'reply',
            reply: {
              id: btn.id || `btn_${idx}`,
              title: btn.title.substring(0, 20), // Meta limit: 20 chars
            },
          })),
        },
      },
    };
  }

  private buildMediaPayload(
    destination: string,
    media: WhatsAppMediaOptions,
    caption?: string,
  ): Record<string, unknown> {
    const base = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: destination,
    };

    switch (media.type) {
      case 'image':
        return {
          ...base,
          type: 'image',
          image: { link: media.url, caption: caption || media.caption || '' },
        };
      case 'document':
        return {
          ...base,
          type: 'document',
          document: {
            link: media.url,
            caption: caption || media.caption || '',
            filename: media.filename || 'document.pdf',
          },
        };
      case 'video':
        return {
          ...base,
          type: 'video',
          video: { link: media.url, caption: caption || media.caption || '' },
        };
      case 'audio':
        return {
          ...base,
          type: 'audio',
          audio: { link: media.url },
        };
      case 'location':
        return {
          ...base,
          type: 'location',
          location: {
            longitude: media.longitude,
            latitude: media.latitude,
            name: media.name || '',
            address: media.address || '',
          },
        };
      default:
        return { ...base, type: 'text', text: { body: caption || '' } };
    }
  }
}
