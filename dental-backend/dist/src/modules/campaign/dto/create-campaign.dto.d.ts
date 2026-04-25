export declare class CreateCampaignDto {
    name: string;
    channel: string;
    template_id?: string;
    segment_type: string;
    segment_config?: Record<string, unknown>;
    scheduled_at?: string;
    button_url_suffix?: string;
    template_variables?: Record<string, string>;
}
