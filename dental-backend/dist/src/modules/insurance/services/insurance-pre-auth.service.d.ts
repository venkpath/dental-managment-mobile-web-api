import { PrismaService } from '../../../database/prisma.service.js';
import { InsuranceFileService } from './insurance-file.service.js';
export interface CreatePreAuthDto {
    patient_insurance_id: string;
    treatment_plan_id?: string;
    notes?: string;
}
export interface SubmitPreAuthDto {
    submission_method: string;
    submission_ref?: string;
    notes?: string;
}
export interface UpdatePreAuthStatusDto {
    status: string;
    approval_code?: string;
    approved_amount_cap?: number;
    valid_from?: string;
    valid_to?: string;
    notes?: string;
}
export declare class InsurancePreAuthService {
    private readonly prisma;
    private readonly files;
    constructor(prisma: PrismaService, files: InsuranceFileService);
    findAll(clinicId: string, filters?: {
        status?: string;
        patient_id?: string;
        skip?: number;
        take?: number;
    }): Promise<{
        total: number;
        items: ({
            claims: {
                id: string;
                status: string;
                created_at: Date;
                claim_number: string | null;
                billed_amount: import("@prisma/client-runtime-utils").Decimal;
            }[];
            patient_insurance: {
                plan: {
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
            };
        } & {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            notes: string | null;
            treatment_plan_id: string | null;
            patient_insurance_id: string;
            valid_from: Date | null;
            valid_to: Date | null;
            submission_method: string | null;
            submission_ref: string | null;
            submitted_at: Date | null;
            submitted_by_user_id: string | null;
            request_pdf_url: string | null;
            approval_letter_url: string | null;
            rejection_letter_url: string | null;
            approval_code: string | null;
            approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
            decision_at: Date | null;
        })[];
    }>;
    findOne(id: string, clinicId: string): Promise<{
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
        patient_insurance: {
            plan: {
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
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        treatment_plan_id: string | null;
        patient_insurance_id: string;
        valid_from: Date | null;
        valid_to: Date | null;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        request_pdf_url: string | null;
        approval_letter_url: string | null;
        rejection_letter_url: string | null;
        approval_code: string | null;
        approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        decision_at: Date | null;
    }>;
    create(clinicId: string, dto: CreatePreAuthDto): Promise<{
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
        patient_insurance: {
            plan: {
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
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        treatment_plan_id: string | null;
        patient_insurance_id: string;
        valid_from: Date | null;
        valid_to: Date | null;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        request_pdf_url: string | null;
        approval_letter_url: string | null;
        rejection_letter_url: string | null;
        approval_code: string | null;
        approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        decision_at: Date | null;
    }>;
    submit(id: string, clinicId: string, dto: SubmitPreAuthDto, userId: string): Promise<{
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
        patient_insurance: {
            plan: {
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
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        treatment_plan_id: string | null;
        patient_insurance_id: string;
        valid_from: Date | null;
        valid_to: Date | null;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        request_pdf_url: string | null;
        approval_letter_url: string | null;
        rejection_letter_url: string | null;
        approval_code: string | null;
        approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        decision_at: Date | null;
    }>;
    updateStatus(id: string, clinicId: string, dto: UpdatePreAuthStatusDto): Promise<{
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
        patient_insurance: {
            plan: {
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
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        treatment_plan_id: string | null;
        patient_insurance_id: string;
        valid_from: Date | null;
        valid_to: Date | null;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        request_pdf_url: string | null;
        approval_letter_url: string | null;
        rejection_letter_url: string | null;
        approval_code: string | null;
        approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        decision_at: Date | null;
    }>;
    uploadDocument(id: string, clinicId: string, slot: 'request' | 'approval' | 'rejection', file: Express.Multer.File): Promise<{
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
        patient_insurance: {
            plan: {
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
        };
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        treatment_plan_id: string | null;
        patient_insurance_id: string;
        valid_from: Date | null;
        valid_to: Date | null;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        request_pdf_url: string | null;
        approval_letter_url: string | null;
        rejection_letter_url: string | null;
        approval_code: string | null;
        approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        decision_at: Date | null;
    }>;
    getDownloadToken(id: string, clinicId: string, slot: 'request' | 'approval' | 'rejection'): Promise<{
        token: string;
        file_url: string;
    }>;
    serveFile(clinicId: string, filePath: string, token: string): string;
}
