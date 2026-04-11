import { PrismaService } from '../../database/prisma.service.js';
import type { UpsertAutomationRuleDto, AutomationRuleType } from './dto/index.js';
export declare class AutomationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
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
    isRuleEnabled(clinicId: string, ruleType: AutomationRuleType): Promise<boolean>;
    getRuleConfig(clinicId: string, ruleType: AutomationRuleType): Promise<({
        template: {
            id: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string | null;
            channel: string;
            category: string;
            template_name: string;
            subject: string | null;
            body: string;
            variables: import("@prisma/client/runtime/client").JsonValue | null;
            language: string;
            is_active: boolean;
            dlt_template_id: string | null;
            whatsapp_template_status: string | null;
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
    }) | null>;
    private seedDefaults;
    private getDefaultRuleTypes;
}
