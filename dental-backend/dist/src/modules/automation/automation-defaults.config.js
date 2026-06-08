"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLINIC_AUTOMATION_DEFAULTS = exports.AUTOMATION_DEFAULT_TEMPLATES = void 0;
exports.getAllAutomationRuleTypes = getAllAutomationRuleTypes;
exports.AUTOMATION_DEFAULT_TEMPLATES = {
    appointment_confirmation: 'dental_appointment_confirmation',
    appointment_cancellation: 'dental_appointment_cancel',
    appointment_rescheduled: 'dental_appointment_rescheduled',
    appointment_reminder: 'dental_appointment_reminder',
    appointment_confirmation_dentist: 'dental_appointment_confirmation_dentist',
    appointment_reminder_dentist: 'dental_appointment_reminder_dentist',
    invoice_ready: 'dental_invoice_pdf',
    payment_confirmation: 'dental_payment_received_pdf',
    prescription_ready: 'dental_prescription_pdf',
    untreated_condition_reminder: 'dental_untreated_condition_reminder',
    treatment_plan_reminder: 'dental_treatment_plan_reminder',
};
exports.CLINIC_AUTOMATION_DEFAULTS = [
    {
        rule_type: 'birthday_greeting',
        is_enabled: false,
        channel: 'preferred',
        config: { send_time: '09:00', include_offer: false },
    },
    {
        rule_type: 'festival_greeting',
        is_enabled: false,
        channel: 'preferred',
        config: { send_day_before: false },
    },
    {
        rule_type: 'post_treatment_care',
        is_enabled: true,
        channel: 'preferred',
        config: { delay_hours: 1 },
    },
    {
        rule_type: 'no_show_followup',
        is_enabled: true,
        channel: 'preferred',
        config: { delay_hours: 1 },
    },
    {
        rule_type: 'dormant_reactivation',
        is_enabled: false,
        channel: 'preferred',
        config: { dormancy_months: 6, check_interval_days: 7 },
    },
    {
        rule_type: 'treatment_plan_reminder',
        is_enabled: false,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.treatment_plan_reminder,
        config: { reminder_interval_days: 14 },
    },
    {
        rule_type: 'untreated_condition_reminder',
        is_enabled: true,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.untreated_condition_reminder,
        config: {
            reminder_1_enabled: true,
            reminder_1_delay: '1M',
            reminder_2_enabled: true,
            reminder_2_delay: '2M',
        },
    },
    {
        rule_type: 'payment_reminder',
        is_enabled: true,
        channel: 'preferred',
        config: { days_before_due: 3 },
    },
    {
        rule_type: 'feedback_collection',
        is_enabled: false,
        channel: 'preferred',
        config: { delay_hours: 4, min_rating_for_google_review: 4 },
    },
    {
        rule_type: 'appointment_reminder_patient',
        is_enabled: true,
        channel: 'whatsapp',
        config: {
            reminder_1_enabled: true,
            reminder_1_hours: 4,
            reminder_1_template_id: null,
            reminder_2_enabled: true,
            reminder_2_hours: 2,
            reminder_2_template_id: null,
        },
        reminder_template_names: {
            1: exports.AUTOMATION_DEFAULT_TEMPLATES.appointment_reminder,
            2: exports.AUTOMATION_DEFAULT_TEMPLATES.appointment_reminder,
        },
    },
    {
        rule_type: 'appointment_confirmation',
        is_enabled: true,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.appointment_confirmation,
        config: {},
    },
    {
        rule_type: 'appointment_cancellation',
        is_enabled: true,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.appointment_cancellation,
        config: {},
    },
    {
        rule_type: 'appointment_rescheduled',
        is_enabled: true,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.appointment_rescheduled,
        config: {},
    },
    {
        rule_type: 'payment_confirmation',
        is_enabled: true,
        channel: 'preferred',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.payment_confirmation,
        config: {},
    },
    {
        rule_type: 'invoice_ready',
        is_enabled: true,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.invoice_ready,
        config: {},
    },
    {
        rule_type: 'payment_overdue',
        is_enabled: true,
        channel: 'preferred',
        config: { days_overdue: 1 },
    },
    {
        rule_type: 'prescription_ready',
        is_enabled: true,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.prescription_ready,
        config: {},
    },
    {
        rule_type: 'followup_reminder',
        is_enabled: false,
        channel: 'preferred',
        config: { advance_days: 3, remind_on_day: true },
    },
    {
        rule_type: 'appointment_confirmation_dentist',
        is_enabled: true,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.appointment_confirmation_dentist,
        config: {},
    },
    {
        rule_type: 'appointment_reminder_dentist',
        is_enabled: true,
        channel: 'whatsapp',
        template_name: exports.AUTOMATION_DEFAULT_TEMPLATES.appointment_reminder_dentist,
        config: { hours: 2 },
    },
    {
        rule_type: 'subscription_payment_reminder',
        is_enabled: true,
        channel: 'whatsapp',
        config: {
            trial_reminder_days_before: [3, 1],
            trial_reminder_days_after: [1],
            renewal_reminder_days_before: [7, 3, 1],
        },
    },
];
function getAllAutomationRuleTypes() {
    return exports.CLINIC_AUTOMATION_DEFAULTS.map((d) => d.rule_type);
}
//# sourceMappingURL=automation-defaults.config.js.map