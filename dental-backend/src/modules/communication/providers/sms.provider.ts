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
    this.logger.log(`SMS provider configured for clinic ${clinicId}: ${providerName} (sender=${config.senderId})`);
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
      const { config, providerName } = ctx;
      const phone = options.to.replace(/[^0-9+]/g, ''); // clean the number

      this.logger.debug(
        `[SMS ${providerName}] Sending to: ${phone} | DLT: ${options.templateId || 'none'} | Length: ${options.body.length}`,
      );

      // MSG91 Send SMS API
      const url = new URL('https://control.msg91.com/api/v5/flow/');

      const payload: Record<string, unknown> = {
        sender: config.senderId,
        route: config.route === 'promotional' ? '1' : '4', // 4 = transactional
        country: '91',
        sms: [
          {
            message: options.body,
            to: [phone.replace(/^\+91/, '').replace(/^\+/, '')], // strip country code for MSG91
          },
        ],
        // DLT fields (required by TRAI for India)
        ...(config.dltEntityId && { DLT_TE_ID: options.templateId }),
        ...(config.dltEntityId && { pe_id: config.dltEntityId }),
      };

      // If the provider uses flow-based API and we have template variables
      if (options.variables && options.templateId) {
        // For MSG91 flow-based API
        const flowPayload = {
          flow_id: options.templateId,
          sender: config.senderId,
          mobiles: phone.replace(/^\+91/, '').replace(/^\+/, ''),
          ...options.variables,
        };

        const flowRes = await fetch('https://control.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'authkey': config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(flowPayload),
        });

        const flowData = await flowRes.json() as { type: string; message: string; request_id?: string };

        if (flowData.type === 'success') {
          this.logger.log(`SMS sent via flow to ${phone}: ${flowData.message}`);
          return { success: true, providerMessageId: flowData.request_id || flowData.message };
        } else {
          this.logger.warn(`SMS flow failed to ${phone}: ${flowData.message}`);
          return { success: false, error: flowData.message };
        }
      }

      // Standard non-flow send
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'authkey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as { type: string; message: string; request_id?: string };

      if (data.type === 'success') {
        this.logger.log(`SMS sent to ${phone}: ${data.message}`);
        return { success: true, providerMessageId: data.request_id || data.message };
      } else {
        this.logger.warn(`SMS send failed to ${phone}: ${data.message}`);
        return { success: false, error: data.message };
      }
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
