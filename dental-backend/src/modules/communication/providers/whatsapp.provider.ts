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

interface ClinicWhatsAppContext {
  config: WhatsAppProviderConfig;
  providerName: string;
}

@Injectable()
export class WhatsAppProvider implements ChannelProvider {
  readonly channel = 'whatsapp' as const;
  private readonly logger = new Logger(WhatsAppProvider.name);
  /** Per-clinic WhatsApp configs */
  private readonly clinicConfigs = new Map<string, ClinicWhatsAppContext>();

  configure(clinicId: string, config: WhatsAppProviderConfig, providerName: string): void {
    this.clinicConfigs.set(clinicId, { config, providerName });
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
      // WhatsApp BSP integration placeholder
      // When Gupshup/WATI is configured, the actual API call goes here
      this.logger.log(
        `[WhatsApp ${ctx.providerName}] To: ${options.to} | ` +
        `Template: ${options.templateId || 'session'} | ` +
        `Media: ${options.mediaUrl || 'none'} | ` +
        `Body: ${options.body.substring(0, 50)}...`,
      );

      // TODO: Replace with actual Gupshup/WATI API call when credentials are available
      // const response = await fetch(`${ctx.config.apiBaseUrl}/message`, {
      //   method: 'POST',
      //   headers: {
      //     'apikey': ctx.config.apiKey,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     channel: 'whatsapp',
      //     source: ctx.config.phoneNumberId,
      //     destination: options.to,
      //     message: { type: 'text', text: options.body },
      //     'src.name': 'DentalCare',
      //   }),
      // });

      // Return not-sent status since WhatsApp API is not yet wired
      return {
        success: false,
        error: `WhatsApp provider "${ctx.providerName}" is configured but API integration is pending. Message logged but not delivered.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown WhatsApp error';
      this.logger.error(`WhatsApp send failed to ${options.to}: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }
}
