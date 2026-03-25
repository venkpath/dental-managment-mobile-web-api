export declare enum PreferredChannel {
    EMAIL = "email",
    SMS = "sms",
    WHATSAPP = "whatsapp"
}
export declare class UpdatePreferencesDto {
    allow_email?: boolean;
    allow_sms?: boolean;
    allow_whatsapp?: boolean;
    allow_marketing?: boolean;
    allow_reminders?: boolean;
    preferred_channel?: PreferredChannel;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
}
