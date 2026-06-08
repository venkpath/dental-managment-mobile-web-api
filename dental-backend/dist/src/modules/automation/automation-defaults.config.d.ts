export interface AutomationRuleDefault {
    rule_type: string;
    is_enabled: boolean;
    channel: string;
    template_name?: string;
    config: Record<string, unknown>;
    reminder_template_names?: {
        1?: string;
        2?: string;
    };
}
export declare const AUTOMATION_DEFAULT_TEMPLATES: {
    readonly appointment_confirmation: "dental_appointment_confirmation";
    readonly appointment_cancellation: "dental_appointment_cancel";
    readonly appointment_rescheduled: "dental_appointment_rescheduled";
    readonly appointment_reminder: "dental_appointment_reminder";
    readonly appointment_confirmation_dentist: "dental_appointment_confirmation_dentist";
    readonly appointment_reminder_dentist: "dental_appointment_reminder_dentist";
    readonly invoice_ready: "dental_invoice_pdf";
    readonly payment_confirmation: "dental_payment_received_pdf";
    readonly prescription_ready: "dental_prescription_pdf";
    readonly untreated_condition_reminder: "dental_untreated_condition_reminder";
    readonly treatment_plan_reminder: "dental_treatment_plan_reminder";
};
export declare const CLINIC_AUTOMATION_DEFAULTS: AutomationRuleDefault[];
export declare function getAllAutomationRuleTypes(): string[];
