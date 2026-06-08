export declare class UpdateGoogleReviewSettingsDto {
    auto_reply_enabled?: boolean;
    auto_post_min_rating?: number;
    tone?: 'warm' | 'formal' | 'brief';
    custom_instructions?: string;
    signature?: string;
    notify_admin_on_low?: boolean;
}
