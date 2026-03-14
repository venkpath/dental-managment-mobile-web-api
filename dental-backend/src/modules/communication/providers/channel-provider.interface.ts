export interface SendMessageOptions {
  to: string; // email address or phone number
  subject?: string; // for email
  body: string; // rendered message body
  html?: string; // HTML body for email
  mediaUrl?: string; // for WhatsApp media messages
  templateId?: string; // provider-specific template ID (DLT for SMS, HSM for WhatsApp)
  variables?: Record<string, string>; // template variables for provider-managed templates
  metadata?: Record<string, unknown>;
  clinicId?: string; // multi-tenant: identifies which clinic config to use
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  cost?: number;
}

export interface DeliveryStatus {
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'bounced';
  timestamp?: Date;
  error?: string;
}

export interface ChannelProvider {
  readonly channel: 'email' | 'sms' | 'whatsapp';

  send(options: SendMessageOptions): Promise<SendResult>;
  getDeliveryStatus?(providerMessageId: string): Promise<DeliveryStatus>;
}
