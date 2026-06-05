export interface ReminderDelayOption {
    value: string;
    label: string;
    minutes: number;
    testingOnly?: boolean;
}
export declare const UNTREATED_CONDITION_REMINDER_DELAYS: ReminderDelayOption[];
export declare function parseReminderDelayMinutes(value: unknown, fallback?: number): number;
export interface UntreatedConditionReminderConfig {
    reminder_1_enabled: boolean;
    reminder_1_delay: string;
    reminder_2_enabled: boolean;
    reminder_2_delay: string;
}
export declare function parseUntreatedConditionConfig(raw: Record<string, unknown> | null | undefined): UntreatedConditionReminderConfig;
