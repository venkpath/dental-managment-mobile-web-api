export declare const SYSTEM_CAMPAIGN_VARIABLES: readonly ["patient_name", "patient_first_name", "patient_last_name", "patient_phone", "patient_email", "clinic_name", "clinic_phone", "today_date"];
export type SystemCampaignVariable = (typeof SYSTEM_CAMPAIGN_VARIABLES)[number];
export declare function isSystemVariable(name: string): boolean;
export type CampaignVariableMapping = {
    type: 'system';
    key: SystemCampaignVariable;
} | {
    type: 'custom';
    value: string;
};
export type CampaignVariableMappingInput = CampaignVariableMapping | string;
export declare function normalizeMapping(input: CampaignVariableMappingInput): CampaignVariableMapping;
export declare function extractUserMappedVariableNames(templateVariables: unknown): string[];
export declare const extractCustomVariableNames: typeof extractUserMappedVariableNames;
