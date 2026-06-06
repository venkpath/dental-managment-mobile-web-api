export type BranchSchedule = {
  working_days: string | null;
  working_start_time: string | null;
  working_end_time: string | null;
  lunch_start_time: string | null;
  lunch_end_time: string | null;
  slot_duration: number | null;
  buffer_minutes: number | null;
  default_appt_duration: number | null;
};

export function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Count bookable slots that start after `fromMinutes`. */
export function countRemainingSlots(b: BranchSchedule, fromMinutes: number): number {
  if (!b.working_start_time || !b.working_end_time) return 0;

  const workStart = timeToMins(b.working_start_time);
  const workEnd = timeToMins(b.working_end_time);
  if (workEnd <= workStart) return 0;

  const slotDuration = Math.max(1, b.slot_duration ?? 15);
  const apptDuration = Math.max(1, b.default_appt_duration ?? 30);
  const lunchStart = b.lunch_start_time ? timeToMins(b.lunch_start_time) : null;
  const lunchEnd = b.lunch_end_time ? timeToMins(b.lunch_end_time) : null;

  let count = 0;
  let cur = workStart;
  while (cur + apptDuration <= workEnd) {
    const overlapsLunch =
      lunchStart != null &&
      lunchEnd != null &&
      cur < lunchEnd &&
      cur + apptDuration > lunchStart;
    if (!overlapsLunch && cur > fromMinutes) count++;
    cur += slotDuration;
  }
  return count;
}

/** Listing card image priority: branch photo → clinic cover → dentist photo. */
export function resolveListingCover(
  branches: { id: string; photo_url: string | null }[],
  clinicCoverKey: string | null,
  dentistPhotoKey: string | null,
): { branchCoverId: string | null; coverKey: string | null } {
  const coverBranch = branches.find((b) => b.photo_url) ?? null;
  if (coverBranch?.photo_url) {
    return { branchCoverId: coverBranch.id, coverKey: coverBranch.photo_url };
  }
  if (clinicCoverKey) {
    return { branchCoverId: null, coverKey: clinicCoverKey };
  }
  if (dentistPhotoKey) {
    return { branchCoverId: null, coverKey: dentistPhotoKey };
  }
  return { branchCoverId: null, coverKey: null };
}

/** Branch/location card image: branch photo → clinic cover (never dentist). */
export function resolveBranchDisplayKey(
  branchPhotoKey: string | null,
  clinicCoverKey: string | null,
): string | null {
  return branchPhotoKey ?? clinicCoverKey ?? null;
}
