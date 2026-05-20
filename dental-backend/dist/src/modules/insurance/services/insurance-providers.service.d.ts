import { PrismaService } from '../../../database/prisma.service.js';
export declare class InsuranceProvidersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listProviders(clinicId: string, opts?: {
        country?: string;
        type?: string;
    }): Promise<({
        plans: ({
            _count: {
                procedure_codes: number;
            };
        } & {
            id: string;
            created_at: Date;
            updated_at: Date;
            is_active: boolean;
            currency: string;
            coverage_rules: import("@prisma/client/runtime/client").JsonValue;
            ortho_coverage: number;
            requires_referral: boolean;
            provider_id: string;
            plan_name: string;
            plan_code: string | null;
            preventive_coverage: number;
            basic_coverage: number;
            major_coverage: number;
            annual_max_amount: import("@prisma/client-runtime-utils").Decimal | null;
            deductible_amount: import("@prisma/client-runtime-utils").Decimal;
            requires_preauth: boolean;
        })[];
    } & {
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        country: string;
        clinic_id: string | null;
        is_active: boolean;
        website: string | null;
        notes: string | null;
        tpa_name: string | null;
        short_code: string;
        type: string;
        contact_email: string | null;
        contact_phone: string | null;
        claim_method: string;
    })[]>;
    getProvider(clinicId: string, id: string): Promise<{
        plans: {
            id: string;
            created_at: Date;
            updated_at: Date;
            is_active: boolean;
            currency: string;
            coverage_rules: import("@prisma/client/runtime/client").JsonValue;
            ortho_coverage: number;
            requires_referral: boolean;
            provider_id: string;
            plan_name: string;
            plan_code: string | null;
            preventive_coverage: number;
            basic_coverage: number;
            major_coverage: number;
            annual_max_amount: import("@prisma/client-runtime-utils").Decimal | null;
            deductible_amount: import("@prisma/client-runtime-utils").Decimal;
            requires_preauth: boolean;
        }[];
    } & {
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        country: string;
        clinic_id: string | null;
        is_active: boolean;
        website: string | null;
        notes: string | null;
        tpa_name: string | null;
        short_code: string;
        type: string;
        contact_email: string | null;
        contact_phone: string | null;
        claim_method: string;
    }>;
    getPlan(clinicId: string, planId: string): Promise<{
        provider: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            country: string;
            clinic_id: string | null;
            is_active: boolean;
            website: string | null;
            notes: string | null;
            tpa_name: string | null;
            short_code: string;
            type: string;
            contact_email: string | null;
            contact_phone: string | null;
            claim_method: string;
        };
        procedure_codes: {
            id: string;
            description: string;
            code: string;
            plan_id: string;
            category: string;
            notes: string | null;
            coverage_pct: number;
            max_fee: import("@prisma/client-runtime-utils").Decimal | null;
            waiting_period_days: number;
            frequency_limit: string | null;
        }[];
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        is_active: boolean;
        currency: string;
        coverage_rules: import("@prisma/client/runtime/client").JsonValue;
        ortho_coverage: number;
        requires_referral: boolean;
        provider_id: string;
        plan_name: string;
        plan_code: string | null;
        preventive_coverage: number;
        basic_coverage: number;
        major_coverage: number;
        annual_max_amount: import("@prisma/client-runtime-utils").Decimal | null;
        deductible_amount: import("@prisma/client-runtime-utils").Decimal;
        requires_preauth: boolean;
    }>;
}
