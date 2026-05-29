/** Mirrors dental-frontend/src/lib/user-feature-grants.ts */
export const OPTIONAL_FEATURE_LIST: { key: string; label: string; desc: string }[] = [
  { key: 'INSURANCE_MODULE', label: 'Insurance & EHS Portal', desc: 'Enroll patients, manage pre-authorisations and claims' },
  { key: 'INVENTORY_MANAGEMENT', label: 'Inventory Management', desc: 'View and manage dental stock and supplies' },
  { key: 'AI_PATIENT_INSIGHTS', label: 'AI Patient Insights', desc: 'No-show risk, recall and churn predictions' },
  { key: 'MARKETING_CAMPAIGNS', label: 'Marketing Campaigns', desc: 'Bulk SMS/Email/WhatsApp campaigns' },
  { key: 'WHATSAPP_INBOX', label: 'WhatsApp Inbox', desc: 'Two-way WhatsApp conversations' },
];

const ROLE_DEFAULTS: Record<string, string[]> = {
  SuperAdmin: ['INSURANCE_MODULE', 'INVENTORY_MANAGEMENT', 'AI_PATIENT_INSIGHTS', 'MARKETING_CAMPAIGNS', 'WHATSAPP_INBOX', 'PATIENT_IMPORT', 'AI_CLINICAL_NOTES', 'WHATSAPP_INTEGRATION', 'CUSTOM_TEMPLATES'],
  Admin: ['INSURANCE_MODULE', 'INVENTORY_MANAGEMENT', 'AI_PATIENT_INSIGHTS', 'MARKETING_CAMPAIGNS', 'WHATSAPP_INBOX', 'PATIENT_IMPORT', 'AI_CLINICAL_NOTES', 'WHATSAPP_INTEGRATION', 'CUSTOM_TEMPLATES'],
  Receptionist: ['INSURANCE_MODULE', 'PATIENT_IMPORT', 'WHATSAPP_INTEGRATION'],
  Staff: ['INVENTORY_MANAGEMENT'],
  Dentist: ['AI_CLINICAL_NOTES'],
  Consultant: ['AI_CLINICAL_NOTES'],
};

export function getOptionalFeaturesForRole(role: string) {
  const defaults = new Set(ROLE_DEFAULTS[role] ?? []);
  return OPTIONAL_FEATURE_LIST.filter((f) => !defaults.has(f.key));
}

export function isDoctorRole(role: string, isDoctor?: boolean) {
  return role === 'Dentist' || role === 'Consultant' || !!isDoctor;
}
