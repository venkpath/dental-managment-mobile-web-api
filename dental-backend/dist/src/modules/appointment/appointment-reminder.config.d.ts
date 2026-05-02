export interface ReminderDefinition {
    index: 1 | 2;
    hours: number;
    enabled: boolean;
}
export declare function getReminderDefinitions(config: Record<string, unknown>): ReminderDefinition[];
export declare function isReminderEnabled(config: Record<string, unknown>, reminderIndex: 1 | 2, fallback?: boolean): boolean;
export interface DentistReminderDefinition {
    hours: number;
}
export declare function getDentistReminderDefinition(config: Record<string, unknown>): DentistReminderDefinition;
