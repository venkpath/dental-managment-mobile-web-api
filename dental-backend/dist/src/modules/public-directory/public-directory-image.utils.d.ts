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
export declare function timeToMins(t: string): number;
export declare function countRemainingSlots(b: BranchSchedule, fromMinutes: number): number;
export declare function resolveListingCover(branches: {
    id: string;
    photo_url: string | null;
}[], clinicCoverKey: string | null, dentistPhotoKey: string | null): {
    branchCoverId: string | null;
    coverKey: string | null;
};
export declare function resolveBranchDisplayKey(branchPhotoKey: string | null, clinicCoverKey: string | null): string | null;
