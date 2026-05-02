export declare class UpsertAutomationRuleDto {
    is_enabled?: boolean;
    channel?: string;
    template_id?: string;
    config?: Record<string, unknown>;
}
export declare const AUTOMATION_RULE_TYPES: readonly ["birthday_greeting", "festival_greeting", "post_treatment_care", "no_show_followup", "dormant_reactivation", "treatment_plan_reminder", "payment_reminder", "feedback_collection", "appointment_reminder_patient", "anniversary_greeting", "prescription_refill", "appointment_confirmation", "appointment_cancellation", "appointment_rescheduled", "payment_confirmation", "invoice_ready", "payment_overdue", "prescription_ready", "appointment_confirmation_dentist", "appointment_reminder_dentist", "subscription_payment_reminder"];
export type AutomationRuleType = typeof AUTOMATION_RULE_TYPES[number];
