export declare class UpdateClinicSettingsDto {
    enable_email?: boolean;
    enable_sms?: boolean;
    enable_whatsapp?: boolean;
    email_provider?: string;
    email_config?: Record<string, unknown>;
    sms_provider?: string;
    sms_config?: Record<string, unknown>;
    whatsapp_provider?: string;
    whatsapp_config?: Record<string, unknown>;
    fallback_chain?: string[];
    default_reminder_channels?: string[];
    daily_message_limit?: number;
    send_rate_per_minute?: number;
    google_review_url?: string;
    dnd_start?: string;
    dnd_end?: string;
}
