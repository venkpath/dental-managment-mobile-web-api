import { clinicService } from '../services/clinic.service';
import { useAuthStore } from '../store/auth.store';
import { resolveClinicLogoUrl } from './clinicLogo';

/** Load clinic name + logo from API and persist in auth storage. */
export async function refreshClinicBranding(): Promise<void> {
  const { clinicId, token } = useAuthStore.getState();
  if (!token || !clinicId) return;

  try {
    const clinic = await clinicService.getMe();
    const clinicLogoUrl = resolveClinicLogoUrl(clinic.id, clinic.logo_url);
    await useAuthStore.getState().updateBranding(clinic.name, clinicLogoUrl);
  } catch {
    // Keep cached branding from login / storage
  }
}
