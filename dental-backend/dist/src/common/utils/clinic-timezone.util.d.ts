export declare const CLINIC_TIMEZONE: string;
export declare function getClinicTodayDateString(reference?: Date): string;
export declare function getClinicHour(reference?: Date): number;
export declare function getClinicGreeting(reference?: Date): string;
export declare function addDaysToDateString(dateStr: string, days: number): string;
export declare function clinicDateToUtcMidnight(dateStr: string): Date;
export declare function clinicPaymentLocalDateExpr(column?: string): string;
