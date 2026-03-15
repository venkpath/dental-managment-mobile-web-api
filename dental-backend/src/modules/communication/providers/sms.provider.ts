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
      const mobileNumber = phone.replace(/^\+91/, '').replace(/^\+/, '');

      this.logger.debug(
        `[SMS ${providerName}] Sending to: ${phone} | DLT: ${options.templateId || 'none'} | Length: ${options.body.length}`,
      );

      // DLT template ID is mandatory for India SMS via MSG91
      if (!options.templateId) {
        this.logger.warn(`SMS send skipped to ${phone}: DLT template ID is required. Assign a template with a DLT ID to the automation rule.`);
        return {
          success: false,
          error: 'DLT template ID is required for SMS in India. Assign a message template with a DLT Template ID.',
        };
      }

      // If the caller provided template variables, use MSG91 flow API
      if (options.variables) {
        const flowPayload = {
          flow_id: options.templateId,
          sender: config.senderId,
          mobiles: mobileNumber,
          ...options.variables,
        };

        this.logger.debug(`[SMS ${providerName}] Flow payload: ${JSON.stringify(flowPayload)}`);

        const flowRes = await fetch('https://control.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'authkey': config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(flowPayload),
        });

        const flowRaw = await flowRes.text();
        this.logger.debug(`[SMS ${providerName}] Flow response (${flowRes.status}): ${flowRaw}`);

        let flowData: Record<string, unknown>;
        try {
          flowData = JSON.parse(flowRaw);
        } catch (_e) {
          return { success: false, error: `MSG91 flow returned non-JSON (${flowRes.status}): ${flowRaw.slice(0, 200)}` };
        }

        const flowMsg = (flowData.message ?? flowData.msg ?? flowRaw) as string;

        if (flowData.type === 'success') {
          this.logger.log(`SMS sent via flow to ${phone}: ${flowMsg}`);
          return { success: true, providerMessageId: (flowData.request_id || flowMsg) as string };
        } else {
          this.logger.warn(`SMS flow failed to ${phone}: ${flowMsg}`);
          return { success: false, error: flowMsg };
        }
      }

      // Standard send SMS API (non-flow) with DLT compliance
      const payload = {
        sender: config.senderId,
        route: config.route === 'promotional' ? '1' : '4',
        country: '91',
        DLT_TE_ID: options.templateId,
        ...(config.dltEntityId && { pe_id: config.dltEntityId }),
        sms: [
          {
            message: options.body,
            to: [mobileNumber],
          },
        ],
      };

      this.logger.debug(`[SMS ${providerName}] Payload: ${JSON.stringify(payload)}`);

      const response = await fetch('https://control.msg91.com/api/v5/sms/send', {
        method: 'POST',
        headers: {
          'authkey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      this.logger.debug(`[SMS ${providerName}] MSG91 response (${response.status}): ${rawText}`);

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        if (response.ok) {
          return { success: true, providerMessageId: rawText };
        }
        return { success: false, error: `MSG91 error (${response.status}): ${rawText.slice(0, 200)}` };
      }

      const isSuccess = data.type === 'success' || (response.ok && data.request_id);
      const msg = (data.message ?? data.msg ?? data.error ?? rawText) as string;

      if (isSuccess) {
        this.logger.log(`SMS sent to ${phone}: ${msg}`);
        return { success: true, providerMessageId: (data.request_id || msg) as string };
      } else {
        this.logger.warn(`SMS send failed to ${phone}: ${msg}`);
        return { success: false, error: msg };
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
