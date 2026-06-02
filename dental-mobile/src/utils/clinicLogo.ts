import { API_BASE_URL } from '../services/api';

/** Build a fetchable logo URL from clinic `logo_url` (S3 key or absolute URL). */
export function resolveClinicLogoUrl(
  clinicId: string,
  logoUrl: string | null | undefined,
): string | null {
  if (!clinicId || !logoUrl?.trim()) return null;
  const trimmed = logoUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const filename = trimmed.split('/').pop();
  if (!filename) return null;
  return `${API_BASE_URL}/clinics/logo/${clinicId}/${filename}`;
}
