/** Backend UserRole values: SuperAdmin, Admin, Dentist, … (see create-user.dto.ts) */

export function normalizeRole(role?: string): string {
  return (role ?? '').trim().toLowerCase();
}

/** Clinic owner / platform super admin — can manage subscription & billing APIs. */
export function canManageClinicBilling(role?: string): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'superadmin';
}
