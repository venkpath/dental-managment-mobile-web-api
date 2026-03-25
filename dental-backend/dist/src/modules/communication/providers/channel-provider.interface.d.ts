export interface SendMessageOptions {
    to: string;
    subject?: string;
    body: string;
    html?: string;
    mediaUrl?: string;
    templateId?: string;
    variables?: Record<string, string>;
    metadata?: Record<string, unknown>;
    clinicId?: string;
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
