export declare enum TemplateChannel {
    EMAIL = "email",
    SMS = "sms",
    WHATSAPP = "whatsapp",
    ALL = "all"
}
export declare enum TemplateCategory {
    REMINDER = "reminder",
    GREETING = "greeting",
    CAMPAIGN = "campaign",
    TRANSACTIONAL = "transactional",
    FOLLOW_UP = "follow_up",
    REFERRAL = "referral"
}
export declare class CreateTemplateDto {
    channel: TemplateChannel;
    category: TemplateCategory;
    template_name: string;
    subject?: string;
    body: string;
    variables?: string[];
    language?: string;
    is_active?: boolean;
    dlt_template_id?: string;
}
