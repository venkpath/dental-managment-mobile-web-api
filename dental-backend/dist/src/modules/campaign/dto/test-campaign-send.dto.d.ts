import type { CampaignVariableMappingInput } from '../system-variables.js';
export declare class TestCampaignSendDto {
    phone: string;
    channel: string;
    template_id: string;
    template_variables?: Record<string, CampaignVariableMappingInput>;
    button_url_suffix?: string;
}
