export declare const INSIGHT_WHATSAPP_TEMPLATE_NAMES: Set<string>;
export declare function isInsightWhatsappTemplate(templateName: string): boolean;
export type InsightWhatsappBuildInput = {
    templateName: string;
    patientFirstName: string;
    patientLastName: string;
    clinicName: string;
    clinicPhone: string;
    bookingUrl: string;
    recallTreatment?: string | null;
    recallDueDays?: number | null;
    recallLastDate?: Date | null;
    offerText?: string | null;
    existing?: Record<string, string>;
};
export declare function buildInsightWhatsappVariables(input: InsightWhatsappBuildInput): Record<string, string>;
export declare function validateInsightWhatsappVariables(vars: Record<string, string>): string | null;
