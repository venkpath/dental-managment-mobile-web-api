import { CreatePatientInsuranceDto } from '../dto/create-patient-insurance.dto.js';
import { UpdatePatientInsuranceDto } from '../dto/update-patient-insurance.dto.js';
import { PatientInsuranceService } from '../services/patient-insurance.service.js';
import { InsuranceFileService } from '../services/insurance-file.service.js';
export declare class PatientInsuranceController {
    private readonly enrollments;
    private readonly files;
    constructor(enrollments: PatientInsuranceService, files: InsuranceFileService);
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
    upload(clinicId: string, id: string, slot: string, file: Express.Multer.File): Promise<{
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
    downloadToken(clinicId: string, id: string, slot: string): Promise<{
        token: string;
        file_url: string;
    }>;
    eligibility(clinicId: string, id: string): Promise<{
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
    coveragePreview(clinicId: string, id: string, body: {
        items: Array<{
            description: string;
            category: 'preventive' | 'basic' | 'major' | 'ortho' | 'emergency';
            clinic_rate: number;
            scheme_max_fee?: number | null;
            quantity?: number;
        }>;
    }): Promise<{
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
}
