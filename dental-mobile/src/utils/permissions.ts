/** Role checks aligned with backend UserRole / mobile auth store. */
export function canManageExpenses(role?: string | null): boolean {
  const r = (role ?? '').toUpperCase().replace(/\s/g, '_');
  return r === 'ADMIN' || r === 'RECEPTIONIST' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
}

export function canManageStaff(role?: string | null): boolean {
  const r = (role ?? '').toUpperCase().replace(/\s/g, '_');
  return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
}

export function canManageBranches(role?: string | null): boolean {
  const r = (role ?? '').toUpperCase().replace(/\s/g, '_');
  return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
}

/** Web parity: only Admin / SuperAdmin can delete expenses (Receptionist can add/edit). */
export function canDeleteExpenses(role?: string | null): boolean {
  const r = (role ?? '').toUpperCase().replace(/\s/g, '_');
  return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
}
