export declare const SYSTEM_CAMPAIGN_VARIABLES: readonly ["patient_name", "patient_first_name", "patient_last_name", "patient_phone", "patient_email", "clinic_name"];
export type SystemCampaignVariable = (typeof SYSTEM_CAMPAIGN_VARIABLES)[number];
export declare function isSystemVariable(name: string): boolean;
export declare function extractCustomVariableNames(templateVariables: unknown): string[];
