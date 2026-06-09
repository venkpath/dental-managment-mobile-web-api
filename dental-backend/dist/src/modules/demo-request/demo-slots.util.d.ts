export declare const DEMO_DAY_START_HOUR = 10;
export declare const DEMO_DAY_END_HOUR = 22;
export declare const DEMO_BLOCKED_SLOTS: Set<string>;
export declare function formatSlot(hour: number, minute: number): string;
export declare function listDemoSlotTimes(): string[];
export declare function isValidDemoSlot(slot: string): boolean;
export type DemoSlotAvailability = {
    slot: string;
    label: string;
    available: boolean;
    reason?: 'lunch' | 'booked';
};
export declare function buildSlotLabel(slot: string): string;
export declare function buildDemoSlotAvailability(takenSlots: Set<string>): DemoSlotAvailability[];
