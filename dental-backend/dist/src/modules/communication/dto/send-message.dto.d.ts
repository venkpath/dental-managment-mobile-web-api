export declare enum MessageChannel {
    EMAIL = "email",
    SMS = "sms",
    WHATSAPP = "whatsapp",
    IN_APP = "in_app"
}
export declare enum MessageCategory {
    TRANSACTIONAL = "transactional",
    PROMOTIONAL = "promotional"
}
export declare class SendMessageDto {
    patient_id: string;
    channel: MessageChannel;
    category?: MessageCategory;
    template_id?: string;
    subject?: string;
    body?: string;
    variables?: Record<string, string>;
    scheduled_at?: string;
    metadata?: Record<string, unknown>;
}
