export declare const NOSHOW_FOLLOWUP_TEMPLATE_NAME = "dental_noshow_followup";
export declare function isNoshowFollowupTemplate(templateName: string): boolean;
export declare function buildNoshowFollowupVariables(input: {
    patientFirstName: string;
    patientLastName: string;
    clinicName: string;
    clinicPhone: string;
    existing?: Record<string, string>;
}): Record<string, string>;
export declare function validateNoshowFollowupVariables(vars: Record<string, string>): string | null;
