"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeToMins = timeToMins;
exports.countRemainingSlots = countRemainingSlots;
exports.resolveListingCover = resolveListingCover;
exports.resolveBranchDisplayKey = resolveBranchDisplayKey;
function timeToMins(t) {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}
function countRemainingSlots(b, fromMinutes) {
    if (!b.working_start_time || !b.working_end_time)
        return 0;
    const workStart = timeToMins(b.working_start_time);
    const workEnd = timeToMins(b.working_end_time);
    if (workEnd <= workStart)
        return 0;
    const slotDuration = Math.max(1, b.slot_duration ?? 15);
    const apptDuration = Math.max(1, b.default_appt_duration ?? 30);
    const lunchStart = b.lunch_start_time ? timeToMins(b.lunch_start_time) : null;
    const lunchEnd = b.lunch_end_time ? timeToMins(b.lunch_end_time) : null;
    let count = 0;
    let cur = workStart;
    while (cur + apptDuration <= workEnd) {
        const overlapsLunch = lunchStart != null &&
            lunchEnd != null &&
            cur < lunchEnd &&
            cur + apptDuration > lunchStart;
        if (!overlapsLunch && cur > fromMinutes)
            count++;
        cur += slotDuration;
    }
    return count;
}
function resolveListingCover(branches, clinicCoverKey, dentistPhotoKey) {
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
function resolveBranchDisplayKey(branchPhotoKey, clinicCoverKey) {
    return branchPhotoKey ?? clinicCoverKey ?? null;
}
//# sourceMappingURL=public-directory-image.utils.js.map