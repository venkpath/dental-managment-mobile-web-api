import { Injectable, Logger } from '@nestjs/common';
import type {
  ChannelProvider,
  SendMessageOptions,
  SendResult,
} from './channel-provider.interface.js';

export interface WhatsAppProviderConfig {
  apiKey: string;
  phoneNumberId: string;
  wabaId?: string;
  apiBaseUrl?: string;
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
    this.logger.log(`WhatsApp provider configured for clinic ${clinicId}: ${providerName}`);
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
        error: 'WhatsApp provider not configured. Enable WhatsApp in clinic communication settings and provide API credentials.',
      };
    }

    try {
      const { config, providerName } = ctx;
      const baseUrl = config.apiBaseUrl || 'https://api.gupshup.io/wa/api/v1';
      const destination = options.to.replace(/[^0-9]/g, '');

      // Determine message type based on options
      const interactiveButtons = options.metadata?.['interactive_buttons'] as WhatsAppInteractiveButton[] | undefined;
      const mediaOptions = options.metadata?.['media'] as WhatsAppMediaOptions | undefined;

      let messagePayload: Record<string, unknown>;

      if (mediaOptions) {
        // ─── Media Message (5.4) ───
        messagePayload = this.buildMediaPayload(config, destination, mediaOptions, options.body);
      } else if (interactiveButtons && interactiveButtons.length > 0) {
        // ─── Interactive Message (5.3) ───
        messagePayload = this.buildInteractivePayload(config, destination, options.body, interactiveButtons);
      } else if (options.templateId) {
        // ─── HSM Template Message ───
        messagePayload = this.buildTemplatePayload(config, destination, options.templateId, options.variables);
      } else {
        // ─── Session/Text Message (5.5) ───
        // Check if session window is open for free-form text
        const sessionOpen = this.isSessionOpen(clinicId, destination);
        if (!sessionOpen && !options.templateId) {
          this.logger.warn(`WhatsApp session expired for ${destination}. Use a template message or wait for patient to respond.`);
        }
        messagePayload = this.buildTextPayload(config, destination, options.body);
      }

      this.logger.debug(`[WhatsApp ${providerName}] Sending to ${destination}: ${JSON.stringify(messagePayload).substring(0, 200)}`);

      const response = await fetch(`${baseUrl}/msg`, {
        method: 'POST',
        headers: {
          'apikey': config.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(
          Object.entries(messagePayload).reduce((acc, [k, v]) => {
            acc[k] = typeof v === 'string' ? v : JSON.stringify(v);
            return acc;
          }, {} as Record<string, string>),
        ),
      });

      const rawText = await response.text();
      this.logger.debug(`[WhatsApp ${providerName}] Response (${response.status}): ${rawText.substring(0, 300)}`);

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (response.ok) {
          return { success: true, providerMessageId: rawText };
        }
        return { success: false, error: `Gupshup returned non-JSON (${response.status}): ${rawText.substring(0, 200)}` };
      }

      if (data.status === 'submitted' || data.status === 'success' || response.ok) {
        const msgId = (data.messageId || data.id || '') as string;
        this.logger.log(`WhatsApp sent to ${destination}: ${msgId}`);
        return { success: true, providerMessageId: msgId };
      } else {
        const errorMsg = (data.message || data.error || rawText) as string;
        this.logger.warn(`WhatsApp send failed to ${destination}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown WhatsApp error';
      this.logger.error(`WhatsApp send failed to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }

  // ─── Template Approval Workflow (5.2) ───

  /**
   * Submit a WhatsApp message template for Meta approval via Gupshup.
   */
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

    const baseUrl = ctx.config.apiBaseUrl || 'https://api.gupshup.io/wa/app';

    try {
      const response = await fetch(`${baseUrl}/${ctx.config.phoneNumberId}/templates`, {
        method: 'POST',
        headers: {
          'apikey': ctx.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elementName: templateData.elementName,
          languageCode: templateData.languageCode,
          category: templateData.category,
          templateType: templateData.templateType,
          body: templateData.body,
          header: templateData.header,
          footer: templateData.footer,
          buttons: templateData.buttons,
        }),
      });

      const data = await response.json() as Record<string, unknown>;

      if (response.ok && data.status === 'success') {
        return { success: true, templateId: data.id as string };
      }

      return { success: false, error: (data.message || 'Template submission failed') as string };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Check the approval status of a submitted template.
   */
  async getTemplateStatus(clinicId: string, templateName: string): Promise<{
    status: string;
    rejectedReason?: string;
  }> {
    const ctx = this.clinicConfigs.get(clinicId);
    if (!ctx) return { status: 'not_configured' };

    const baseUrl = ctx.config.apiBaseUrl || 'https://api.gupshup.io/wa/app';

    try {
      const response = await fetch(
        `${baseUrl}/${ctx.config.phoneNumberId}/templates?elementName=${encodeURIComponent(templateName)}`,
        {
          headers: { 'apikey': ctx.config.apiKey },
        },
      );

      const data = await response.json() as Record<string, unknown>;
      const templates = (data.templates || []) as Array<Record<string, unknown>>;
      const template = templates.find(t => t.elementName === templateName);

      if (!template) return { status: 'not_found' };

      return {
        status: (template.status as string) || 'unknown',
        rejectedReason: template.rejectedReason as string | undefined,
      };
    } catch {
      return { status: 'error' };
    }
  }

  // ─── Private Payload Builders ───

  private buildTextPayload(config: WhatsAppProviderConfig, destination: string, body: string): Record<string, unknown> {
    return {
      channel: 'whatsapp',
      source: config.phoneNumberId,
      destination,
      message: JSON.stringify({ type: 'text', text: body }),
      'src.name': 'DentalCare',
    };
  }

  private buildTemplatePayload(
    config: WhatsAppProviderConfig,
    destination: string,
    templateId: string,
    variables?: Record<string, string>,
  ): Record<string, unknown> {
    const params = variables ? Object.values(variables) : [];
    return {
      channel: 'whatsapp',
      source: config.phoneNumberId,
      destination,
      template: JSON.stringify({
        id: templateId,
        params,
      }),
      'src.name': 'DentalCare',
    };
  }

  private buildInteractivePayload(
    config: WhatsAppProviderConfig,
    destination: string,
    body: string,
    buttons: WhatsAppInteractiveButton[],
  ): Record<string, unknown> {
    const interactiveContent: Record<string, unknown> = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((btn, idx) => ({
          type: btn.type === 'url' ? 'url' : 'reply',
          reply: btn.type === 'reply' ? { id: btn.id || `btn_${idx}`, title: btn.title } : undefined,
          url: btn.type === 'url' ? btn.url : undefined,
          title: btn.title,
        })),
      },
    };

    return {
      channel: 'whatsapp',
      source: config.phoneNumberId,
      destination,
      message: JSON.stringify({
        type: 'interactive',
        interactive: interactiveContent,
      }),
      'src.name': 'DentalCare',
    };
  }

  private buildMediaPayload(
    config: WhatsAppProviderConfig,
    destination: string,
    media: WhatsAppMediaOptions,
    caption?: string,
  ): Record<string, unknown> {
    let message: Record<string, unknown>;

    switch (media.type) {
      case 'image':
        message = {
          type: 'image',
          originalUrl: media.url,
          previewUrl: media.url,
          caption: caption || media.caption || '',
        };
        break;
      case 'document':
        message = {
          type: 'file',
          url: media.url,
          filename: media.filename || 'document.pdf',
          caption: caption || media.caption || '',
        };
        break;
      case 'video':
        message = {
          type: 'video',
          url: media.url,
          caption: caption || media.caption || '',
        };
        break;
      case 'audio':
        message = {
          type: 'audio',
          url: media.url,
        };
        break;
      case 'location':
        message = {
          type: 'location',
          longitude: media.longitude,
          latitude: media.latitude,
          name: media.name || '',
          address: media.address || '',
        };
        break;
      default:
        message = { type: 'text', text: caption || '' };
    }

    return {
      channel: 'whatsapp',
      source: config.phoneNumberId,
      destination,
      message: JSON.stringify(message),
      'src.name': 'DentalCare',
    };
  }
}
