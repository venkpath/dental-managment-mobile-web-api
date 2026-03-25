export declare class UpsertAutomationRuleDto {
    is_enabled?: boolean;
    channel?: string;
    template_id?: string;
    config?: Record<string, unknown>;
}
export declare const AUTOMATION_RULE_TYPES: readonly ["birthday_greeting", "festival_greeting", "post_treatment_care", "no_show_followup", "dormant_reactivation", "treatment_plan_reminder", "payment_reminder", "feedback_collection", "appointment_reminder_patient", "anniversary_greeting", "prescription_refill"];
export type AutomationRuleType = typeof AUTOMATION_RULE_TYPES[number];
