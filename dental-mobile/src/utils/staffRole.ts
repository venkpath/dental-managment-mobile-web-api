export function staffRoleMeta(role: string, isDoctor?: boolean) {
  const r = (role ?? '').toLowerCase();
  if (isDoctor || r === 'dentist' || r === 'consultant') {
    return { label: r === 'consultant' ? 'Consultant' : 'Dentist', fg: '#6d28d9', bg: '#f5f3ff' };
  }
  if (r === 'admin' || r === 'superadmin' || r === 'super_admin') {
    return { label: 'Admin', fg: '#1d4ed8', bg: '#dbeafe' };
  }
  if (r === 'receptionist') {
    return { label: 'Receptionist', fg: '#0e7490', bg: '#ecfeff' };
  }
  if (r === 'staff') {
    return { label: 'Staff', fg: '#475569', bg: '#f1f5f9' };
  }
  return { label: role || 'User', fg: '#475569', bg: '#f1f5f9' };
}

export function staffStatusMeta(status: string) {
  const s = (status ?? 'active').toLowerCase();
  if (s === 'inactive' || s === 'disabled') {
    return { label: 'Inactive', fg: '#64748b', bg: '#f1f5f9' };
  }
  return { label: 'Active', fg: '#059669', bg: '#d1fae5' };
}
