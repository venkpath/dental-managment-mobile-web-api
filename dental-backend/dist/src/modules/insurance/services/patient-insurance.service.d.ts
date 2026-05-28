import { PrismaService } from '../../../database/prisma.service.js';
import { InsuranceFileService } from './insurance-file.service.js';
import { InsuranceStrategyFactory } from '../strategies/strategy.factory.js';
import type { CreatePatientInsuranceDto } from '../dto/create-patient-insurance.dto.js';
import type { UpdatePatientInsuranceDto } from '../dto/update-patient-insurance.dto.js';
export declare class PatientInsuranceService {
    private readonly prisma;
    private readonly files;
    private readonly strategyFactory;
    constructor(prisma: PrismaService, files: InsuranceFileService, strategyFactory: InsuranceStrategyFactory);
    list(clinicId: string, patientId: string): Promise<({
        plan: {
            _count: {
                procedure_codes: number;
            };
            provider: {
                id: string;
                name: string;
                country: string;
                short_code: string;
                type: string;
                claim_method: string;
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
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        plan_id: string;
        clinic_id: string;
        is_active: boolean;
        notes: string | null;
        patient_id: string;
        priority: number;
        member_id: string;
        group_number: string | null;
        employee_id: string | null;
        beneficiary_id: string | null;
        company_name: string | null;
        subscriber_name: string | null;
        relationship: string | null;
        coverage_start: Date | null;
        coverage_end: Date | null;
        card_front_url: string | null;
        card_back_url: string | null;
        referral_letter_url: string | null;
    })[]>;
    listAll(clinicId: string, filters?: {
        search?: string;
        provider_id?: string;
        is_active?: boolean;
        skip?: number;
        take?: number;
    }): Promise<{
        total: number;
        items: ({
            plan: {
                _count: {
                    procedure_codes: number;
                };
                provider: {
                    id: string;
                    name: string;
                    country: string;
                    short_code: string;
                    type: string;
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
            };
            patient: {
                id: string;
                phone: string;
                first_name: string;
                last_name: string;
            };
        } & {
            id: string;
            created_at: Date;
            updated_at: Date;
            plan_id: string;
            clinic_id: string;
            is_active: boolean;
            notes: string | null;
            patient_id: string;
            priority: number;
            member_id: string;
            group_number: string | null;
            employee_id: string | null;
            beneficiary_id: string | null;
            company_name: string | null;
            subscriber_name: string | null;
            relationship: string | null;
            coverage_start: Date | null;
            coverage_end: Date | null;
            card_front_url: string | null;
            card_back_url: string | null;
            referral_letter_url: string | null;
        })[];
    }>;
    get(clinicId: string, id: string): Promise<{
        plan: {
            _count: {
                procedure_codes: number;
            };
            provider: {
                id: string;
                name: string;
                country: string;
                short_code: string;
                type: string;
                claim_method: string;
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
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        plan_id: string;
        clinic_id: string;
        is_active: boolean;
        notes: string | null;
        patient_id: string;
        priority: number;
        member_id: string;
        group_number: string | null;
        employee_id: string | null;
        beneficiary_id: string | null;
        company_name: string | null;
        subscriber_name: string | null;
        relationship: string | null;
        coverage_start: Date | null;
        coverage_end: Date | null;
        card_front_url: string | null;
        card_back_url: string | null;
        referral_letter_url: string | null;
    }>;
    create(clinicId: string, patientId: string, dto: CreatePatientInsuranceDto): Promise<{
        plan: {
            _count: {
                procedure_codes: number;
            };
            provider: {
                id: string;
                name: string;
                country: string;
                short_code: string;
                type: string;
                claim_method: string;
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
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        plan_id: string;
        clinic_id: string;
        is_active: boolean;
        notes: string | null;
        patient_id: string;
        priority: number;
        member_id: string;
        group_number: string | null;
        employee_id: string | null;
        beneficiary_id: string | null;
        company_name: string | null;
        subscriber_name: string | null;
        relationship: string | null;
        coverage_start: Date | null;
        coverage_end: Date | null;
        card_front_url: string | null;
        card_back_url: string | null;
        referral_letter_url: string | null;
    }>;
    update(clinicId: string, id: string, dto: UpdatePatientInsuranceDto): Promise<{
        plan: {
            _count: {
                procedure_codes: number;
            };
            provider: {
                id: string;
                name: string;
                country: string;
                short_code: string;
                type: string;
                claim_method: string;
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
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        plan_id: string;
        clinic_id: string;
        is_active: boolean;
        notes: string | null;
        patient_id: string;
        priority: number;
        member_id: string;
        group_number: string | null;
        employee_id: string | null;
        beneficiary_id: string | null;
        company_name: string | null;
        subscriber_name: string | null;
        relationship: string | null;
        coverage_start: Date | null;
        coverage_end: Date | null;
        card_front_url: string | null;
        card_back_url: string | null;
        referral_letter_url: string | null;
    }>;
    remove(clinicId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    uploadDocument(clinicId: string, id: string, slot: 'card_front' | 'card_back' | 'referral_letter', file: Express.Multer.File): Promise<{
        plan: {
            _count: {
                procedure_codes: number;
            };
            provider: {
                id: string;
                name: string;
                country: string;
                short_code: string;
                type: string;
                claim_method: string;
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
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        plan_id: string;
        clinic_id: string;
        is_active: boolean;
        notes: string | null;
        patient_id: string;
        priority: number;
        member_id: string;
        group_number: string | null;
        employee_id: string | null;
        beneficiary_id: string | null;
        company_name: string | null;
        subscriber_name: string | null;
        relationship: string | null;
        coverage_start: Date | null;
        coverage_end: Date | null;
        card_front_url: string | null;
        card_back_url: string | null;
        referral_letter_url: string | null;
    }>;
    previewCoverage(clinicId: string, patientInsuranceId: string, items: Array<{
        description: string;
        category: 'preventive' | 'basic' | 'major' | 'ortho' | 'emergency';
        clinic_rate: number;
        scheme_max_fee?: number | null;
        quantity?: number;
    }>): Promise<{
        currency: string;
        lines: import("../strategies/country-strategy.interface.js").CoverageBreakdownLine[];
        insurance_total: number;
        patient_copay_total: number;
        invoice_total: number;
        notes: string[];
        enrollment_id: string;
        provider: {
            id: string;
            name: string;
            short_code: string;
            country: string;
        };
        plan: {
            id: string;
            name: string;
            currency: string;
        };
    }>;
    checkEligibility(clinicId: string, patientInsuranceId: string): Promise<{
        is_covered: boolean;
        reasons: string[];
        warnings: string[];
        requires_preauth: boolean;
        requires_referral: boolean;
        enrollment_id: string;
        provider: {
            id: string;
            name: string;
            short_code: string;
            country: string;
        };
        plan: {
            id: string;
            name: string;
            currency: string;
        };
        clinic_empanelled: boolean;
        empanelment_number: string | null;
    }>;
    private ensurePatient;
    private ensurePlanVisible;
}
