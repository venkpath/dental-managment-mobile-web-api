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
] as const;
