import { Injectable, Logger } from '@nestjs/common';
import type {
  ChannelProvider,
  SendMessageOptions,
  SendResult,
} from './channel-provider.interface.js';

export interface SmsProviderConfig {
  apiKey: string;
  senderId: string;
  dltEntityId?: string;
  route?: 'transactional' | 'promotional';
}

interface ClinicSmsContext {
  config: SmsProviderConfig;
  providerName: string;
}

@Injectable()
export class SmsProvider implements ChannelProvider {
  readonly channel = 'sms' as const;
  private readonly logger = new Logger(SmsProvider.name);
  /** Per-clinic SMS configs */
  private readonly clinicConfigs = new Map<string, ClinicSmsContext>();

  configure(clinicId: string, config: SmsProviderConfig, providerName: string): void {
    this.clinicConfigs.set(clinicId, { config, providerName });
    this.logger.log(`SMS provider configured for clinic ${clinicId}: ${providerName}`);
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
      this.logger.warn(`SMS provider not configured for clinic ${clinicId} — message not sent`);
      return {
        success: false,
        error: 'SMS provider not configured. Enable SMS in clinic communication settings and provide API credentials.',
      };
    }

    // Validate message length
    const isUnicode = /[^\x00-\x7F]/.test(options.body);
    const maxLength = isUnicode ? 70 : 160;
    if (options.body.length > maxLength) {
      this.logger.warn(
        `SMS body exceeds ${maxLength} chars (${options.body.length}). ` +
        `Message will be split by provider.`,
      );
    }

    try {
      // SMS provider integration placeholder
      // When MSG91/Textlocal is configured, the actual API call goes here
      this.logger.log(
        `[SMS ${ctx.providerName}] To: ${options.to} | ` +
        `DLT: ${options.templateId || 'none'} | ` +
        `Length: ${options.body.length} | ` +
        `Body: ${options.body.substring(0, 50)}...`,
      );

      // TODO: Replace with actual MSG91/Textlocal API call when credentials are available
      // const response = await fetch(`https://api.msg91.com/api/v5/flow/`, {
      //   method: 'POST',
      //   headers: { authkey: ctx.config.apiKey },
      //   body: JSON.stringify({
      //     sender: ctx.config.senderId,
      //     DLT_TE_ID: options.templateId,
      //     mobiles: options.to,
      //     message: options.body,
      //   }),
      // });

      // Return not-sent status since SMS API is not yet wired
      return {
        success: false,
        error: `SMS provider "${ctx.providerName}" is configured but API integration is pending. Message logged but not delivered.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SMS error';
      this.logger.error(`SMS send failed to ${options.to}: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }
}
