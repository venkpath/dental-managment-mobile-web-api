export declare class CreateCampaignDto {
    name: string;
    channel: string;
    template_id?: string;
    segment_type: string;
    segment_config?: Record<string, unknown>;
    scheduled_at?: string;
}
