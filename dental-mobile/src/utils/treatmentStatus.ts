import type { TreatmentStatus } from '../types';

/** Normalize API / legacy uppercase values to backend enum strings. */
export function normalizeTreatmentStatus(status: string): TreatmentStatus {
  const s = status.toLowerCase();
  if (s === 'planned' || s === 'in_progress' || s === 'completed') return s;
  return 'planned';
}

export function treatmentStatusMeta(status: string) {
  const s = normalizeTreatmentStatus(status);
  switch (s) {
    case 'planned':      return { bg: '#f5f3ff', fg: '#7c3aed', label: 'Planned' };
    case 'in_progress':  return { bg: '#fef3c7', fg: '#d97706', label: 'In Progress' };
    case 'completed':    return { bg: '#d1fae5', fg: '#059669', label: 'Completed' };
    default:            return { bg: '#f1f5f9', fg: '#64748b', label: status };
  }
}
