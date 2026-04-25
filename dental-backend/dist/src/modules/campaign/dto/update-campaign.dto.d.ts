export declare class UpdateCampaignDto {
    name?: string;
    channel?: string;
    template_id?: string;
    segment_type?: string;
    segment_config?: Record<string, unknown>;
    status?: string;
    scheduled_at?: string;
    template_variables?: Record<string, string>;
}
