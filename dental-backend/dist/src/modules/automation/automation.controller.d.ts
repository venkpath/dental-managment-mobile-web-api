import { Queue } from 'bullmq';
import { AutomationService } from './automation.service.js';
import { AutomationCronService } from './automation.cron.js';
import { UpsertAutomationRuleDto } from './dto/index.js';
import { PrismaService } from '../../database/prisma.service.js';
export declare class AutomationController {
    private readonly automationService;
    private readonly automationCronService;
    private readonly prisma;
    private readonly reminderQueue;
    constructor(automationService: AutomationService, automationCronService: AutomationCronService, prisma: PrismaService, reminderQueue: Queue);
    getAllRules(clinicId: string): Promise<({
        template: {
            id: string;
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string;
        channel: string;
        config: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        rule_type: string;
    })[]>;
    getRule(clinicId: string, ruleType: string): Promise<{
        template: {
            id: string;
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string;
        channel: string;
        config: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        rule_type: string;
    }>;
    upsertRule(clinicId: string, ruleType: string, dto: UpsertAutomationRuleDto): Promise<{
        template: {
            id: string;
            channel: string;
            template_name: string;
        } | null;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        is_enabled: boolean;
        clinic_id: string;
        channel: string;
        config: import("@prisma/client/runtime/client").JsonValue | null;
        template_id: string | null;
        rule_type: string;
    }>;
    triggerCrons(): Promise<{
        message: string;
        results: Record<string, string>;
    }>;
    triggerSingleCron(jobName: string): Promise<{
        job: string;
        status: string;
        error?: undefined;
    } | {
        job: string;
        status: string;
        error: string;
    }>;
    inspectReminderQueue(): Promise<{
        counts: {
            delayed: number;
            waiting: number;
            active: number;
            failed: number;
            completed: number;
        };
        delayed: {
            jobId: string | undefined;
            appointmentId: unknown;
            reminderIndex: unknown;
            reminderHours: unknown;
            firesAt: string;
            firesIn: string;
        }[];
        active: {
            jobId: string | undefined;
            appointmentId: unknown;
            reminderIndex: unknown;
            reminderHours: unknown;
        }[];
        failed: {
            jobId: string | undefined;
            appointmentId: unknown;
            reminderIndex: unknown;
            reminderHours: unknown;
            error: string;
            attemptsMade: number;
        }[];
        completed: {
            jobId: string | undefined;
            appointmentId: unknown;
            reminderIndex: unknown;
            reminderHours: unknown;
        }[];
    }>;
    retryReminderJob(jobId: string): Promise<{
        success: boolean;
        error: string;
        jobId?: undefined;
    } | {
        success: boolean;
        jobId: string;
        error?: undefined;
    }>;
    debugReminderSchedule(clinicId: string, appointmentId: string): Promise<{
        error: string;
        appointment?: undefined;
        preview?: undefined;
        actualQueuedJobs?: undefined;
    } | {
        appointment: {
            id: string;
            date: Date;
            startTime: string;
            status: string;
        };
        preview: {
            status: string;
            reminders: never[];
            appointmentStartUtc?: undefined;
            nowUtc?: undefined;
        } | {
            status: string;
            appointmentStartUtc: string;
            nowUtc: string;
            reminders: {
                reminderIndex: 1 | 2;
                reminderHours: number;
                enabled: boolean;
                wouldFireAt: string;
                wouldFireIn: string | null;
                status: string;
            }[];
        };
        actualQueuedJobs: ({
            jobId: string | undefined;
            state: "unknown" | import("bullmq").JobState;
            firesAt: string;
        } | null)[];
        error?: undefined;
    }>;
}
