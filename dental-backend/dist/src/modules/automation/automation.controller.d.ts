import { Queue } from 'bullmq';
import { AutomationService } from './automation.service.js';
import { AutomationCronService } from './automation.cron.js';
import { UpsertAutomationRuleDto } from './dto/index.js';
export declare class AutomationController {
    private readonly automationService;
    private readonly automationCronService;
    private readonly reminderQueue;
    constructor(automationService: AutomationService, automationCronService: AutomationCronService, reminderQueue: Queue);
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
}
