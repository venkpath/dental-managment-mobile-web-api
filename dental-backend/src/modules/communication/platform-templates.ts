/**
 * Platform-level WhatsApp templates that belong to Smart Dental Desk (the SaaS),
 * NOT to individual clinics. These templates are used internally for demo
 * requests and platform-billing invoices, and should be hidden from clinic
 * template management UIs (and excluded from the clinic-template Meta sync).
 */
export const PLATFORM_TEMPLATE_NAMES = [
  'demo_request_confirmation',
  'demo_request_admin_alert',
  'demo_scheduled_confirmation',
  'platform_subscription_invoice',
  'platform_subscription_invoice_due',
  // SaaS billing reminders — sent to clinic admin from the platform's WABA,
  // never authored or submitted by the clinic itself.
  'platform_trial_ending_soon',
  'platform_trial_expired',
  'platform_payment_reminder_post_trial',
  'platform_subscription_renewal_reminder',
  'platform_subscription_expired',
  'platform_final_payment_reminder',
  // Legacy placeholder names (kept here so any pre-existing seed rows in
  // dev/staging DBs remain hidden from clinic UI).
  'dental_subscription_trial_ending',
  'dental_subscription_trial_expired',
  'dental_subscription_renewal_reminder',
] as const;
