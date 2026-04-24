import { AutomationService } from './automation.service.js';
import { AutomationCronService } from './automation.cron.js';
import { UpsertAutomationRuleDto } from './dto/index.js';
export declare class AutomationController {
    private readonly automationService;
    private readonly automationCronService;
    constructor(automationService: AutomationService, automationCronService: AutomationCronService);
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
        template_id: string | null;
        rule_type: string;
        config: import("@prisma/client/runtime/client").JsonValue | null;
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
        template_id: string | null;
        rule_type: string;
        config: import("@prisma/client/runtime/client").JsonValue | null;
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
        template_id: string | null;
        rule_type: string;
        config: import("@prisma/client/runtime/client").JsonValue | null;
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
}
