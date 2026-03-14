import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type {
  ChannelProvider,
  SendMessageOptions,
  SendResult,
} from './channel-provider.interface.js';

export interface EmailProviderConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  from?: string;
}

interface ClinicEmailContext {
  transporter: nodemailer.Transporter;
  providerName: string;
  from?: string;
}

@Injectable()
export class EmailProvider implements ChannelProvider {
  readonly channel = 'email' as const;
  private readonly logger = new Logger(EmailProvider.name);
  /** Per-clinic transporter instances */
  private readonly clinicTransporters = new Map<string, ClinicEmailContext>();

  configure(clinicId: string, config: EmailProviderConfig, providerName: string): void {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
    this.clinicTransporters.set(clinicId, { transporter, providerName, from: config.from || config.user });
    this.logger.log(`Email provider configured for clinic ${clinicId}: ${providerName} (${config.host}:${config.port})`);
  }

  getProviderName(clinicId: string): string {
    return this.clinicTransporters.get(clinicId)?.providerName || 'disabled';
  }

  isConfigured(clinicId: string): boolean {
    return this.clinicTransporters.has(clinicId);
  }

  removeClinic(clinicId: string): void {
    this.clinicTransporters.delete(clinicId);
  }

  async send(options: SendMessageOptions): Promise<SendResult> {
    const clinicId = options.clinicId || '';
    const ctx = this.clinicTransporters.get(clinicId);

    if (!ctx) {
      this.logger.warn(`Email provider not configured for clinic ${clinicId} — message not sent`);
      return {
        success: false,
        error: 'Email provider not configured. Enable email in clinic communication settings.',
      };
    }

    try {
      const info = await ctx.transporter.sendMail({
        from: (options.metadata?.['from'] as string) || ctx.from || process.env['EMAIL_FROM'] || 'noreply@dentalcare.com',
        to: options.to,
        subject: options.subject || 'Notification',
        text: options.body,
        html: options.html || options.body,
      });

      this.logger.debug(`Email sent to ${options.to}: ${info.messageId}`);
      return {
        success: true,
        providerMessageId: info.messageId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(`Email send failed to ${options.to}: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }
}
