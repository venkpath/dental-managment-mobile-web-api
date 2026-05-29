import type { CreatePrescriptionItem } from '../services/prescription.service';

/** UI medicine row — supports legacy `drug_name` alias. */
export interface PrescriptionMedFormItem {
  medicine_name?: string;
  drug_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  purpose?: string;
  notes?: string;
  warnings?: string;
  morning?: string | number;
  afternoon?: string | number;
  evening?: string | number;
  night?: string | number;
}

export function medName(it: PrescriptionMedFormItem): string {
  return (it.medicine_name ?? it.drug_name ?? '').trim();
}

export function toApiPrescriptionItem(it: PrescriptionMedFormItem): CreatePrescriptionItem {
  return {
    medicine_name: medName(it),
    dosage: it.dosage.trim(),
    frequency: it.frequency,
    duration: it.duration,
    route: it.route?.trim() || undefined,
    purpose: it.purpose?.trim() || undefined,
    notes: it.notes?.trim() || undefined,
    warnings: it.warnings?.trim() || undefined,
    morning: Number(it.morning || 0),
    afternoon: Number(it.afternoon || 0),
    evening: Number(it.evening || 0),
    night: Number(it.night || 0),
  };
}

export function toApiPrescriptionItems(items: PrescriptionMedFormItem[]): CreatePrescriptionItem[] {
  return items.filter((it) => medName(it).length > 0).map(toApiPrescriptionItem);
}
