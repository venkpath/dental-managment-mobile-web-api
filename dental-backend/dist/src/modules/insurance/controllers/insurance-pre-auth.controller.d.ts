import type { Response } from 'express';
import { InsurancePreAuthService, type CreatePreAuthDto, type SubmitPreAuthDto, type UpdatePreAuthStatusDto } from '../services/insurance-pre-auth.service.js';
export declare class InsurancePreAuthController {
    private readonly svc;
    constructor(svc: InsurancePreAuthService);
    findAll(clinicId: string, status?: string, patient_id?: string, skip?: number, take?: number): Promise<{
        total: number;
        items: ({
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
            claims: {
                id: string;
                status: string;
                created_at: Date;
                claim_number: string | null;
                billed_amount: import("@prisma/client-runtime-utils").Decimal;
            }[];
        } & {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            notes: string | null;
            patient_insurance_id: string;
            treatment_plan_id: string | null;
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
    findOne(clinicId: string, id: string): Promise<{
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
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        patient_insurance_id: string;
        treatment_plan_id: string | null;
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
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        patient_insurance_id: string;
        treatment_plan_id: string | null;
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
    submit(clinicId: string, user: {
        sub: string;
    }, id: string, dto: SubmitPreAuthDto): Promise<{
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
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        patient_insurance_id: string;
        treatment_plan_id: string | null;
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
    updateStatus(clinicId: string, id: string, dto: UpdatePreAuthStatusDto): Promise<{
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
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        patient_insurance_id: string;
        treatment_plan_id: string | null;
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
    uploadDocument(clinicId: string, id: string, slot: string, file: Express.Multer.File): Promise<{
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
        claims: {
            id: string;
            status: string;
            created_at: Date;
            claim_number: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        notes: string | null;
        patient_insurance_id: string;
        treatment_plan_id: string | null;
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
    getDownloadToken(clinicId: string, id: string, slot: string): Promise<{
        token: string;
        file_url: string;
    }>;
}
export declare class InsurancePreAuthServeController {
    private readonly svc;
    constructor(svc: InsurancePreAuthService);
    serve(clinicId: string, filePath: string, token: string, res: Response): void;
}
