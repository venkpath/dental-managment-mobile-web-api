import { InsuranceClaimsService } from '../services/insurance-claims.service.js';
import { SubmitClaimDto, UpdateClaimStatusDto, RecordClaimPaymentDto } from '../dto/create-claim.dto.js';
export declare class InsuranceClaimsController {
    private readonly claimsService;
    constructor(claimsService: InsuranceClaimsService);
    findAll(clinicId: string, status?: string, patient_id?: string, provider_id?: string, from?: string, to?: string, skip?: number, take?: number): Promise<{
        total: number;
        items: ({
            invoice: {
                id: string;
                invoice_number: string;
                total_amount: import("@prisma/client-runtime-utils").Decimal;
            };
            patient_insurance: {
                plan: {
                    provider: {
                        id: string;
                        name: string;
                        country: string;
                        short_code: string;
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
            currency: string;
            notes: string | null;
            paid_at: Date | null;
            approved_amount: import("@prisma/client-runtime-utils").Decimal | null;
            patient_insurance_id: string;
            invoice_id: string;
            submission_method: string | null;
            submission_ref: string | null;
            submitted_at: Date | null;
            submitted_by_user_id: string | null;
            decision_at: Date | null;
            claim_number: string | null;
            pre_auth_code: string | null;
            pre_auth_id: string | null;
            billed_amount: import("@prisma/client-runtime-utils").Decimal;
            patient_portion: import("@prisma/client-runtime-utils").Decimal | null;
            disallowed_amount: import("@prisma/client-runtime-utils").Decimal | null;
            paid_amount: import("@prisma/client-runtime-utils").Decimal | null;
            rejection_reason: string | null;
            query_text: string | null;
            query_response_at: Date | null;
            claim_form_url: string | null;
            consolidated_package_url: string | null;
        })[];
    }>;
    getStats(clinicId: string): Promise<Record<string, {
        count: number;
        billed: number;
        paid: number;
    }>>;
    getMonthlyReceived(clinicId: string): Promise<{
        amount: number;
        month: string;
    }>;
    findByInvoice(clinicId: string, invoiceId: string): Promise<({
        attachments: {
            id: string;
            description: string | null;
            type: string;
            mime_type: string;
            file_url: string;
            file_name: string;
            original_name: string;
            size_bytes: number | null;
            claim_id: string;
            uploaded_by_user_id: string | null;
            uploaded_at: Date;
        }[];
        invoice: {
            id: string;
            status: string;
            invoice_number: string;
            total_amount: import("@prisma/client-runtime-utils").Decimal;
        };
        patient_insurance: {
            plan: {
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
        pre_auth: {
            id: string;
            status: string;
            valid_from: Date | null;
            valid_to: Date | null;
            submission_method: string | null;
            submitted_at: Date | null;
            approval_code: string | null;
            approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        } | null;
        status_history: {
            id: string;
            note: string | null;
            from_status: string | null;
            to_status: string;
            changed_by_user_id: string | null;
            changed_at: Date;
            claim_id: string;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        currency: string;
        notes: string | null;
        paid_at: Date | null;
        approved_amount: import("@prisma/client-runtime-utils").Decimal | null;
        patient_insurance_id: string;
        invoice_id: string;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        decision_at: Date | null;
        claim_number: string | null;
        pre_auth_code: string | null;
        pre_auth_id: string | null;
        billed_amount: import("@prisma/client-runtime-utils").Decimal;
        patient_portion: import("@prisma/client-runtime-utils").Decimal | null;
        disallowed_amount: import("@prisma/client-runtime-utils").Decimal | null;
        paid_amount: import("@prisma/client-runtime-utils").Decimal | null;
        rejection_reason: string | null;
        query_text: string | null;
        query_response_at: Date | null;
        claim_form_url: string | null;
        consolidated_package_url: string | null;
    }) | null>;
    findOne(clinicId: string, id: string): Promise<{
        attachments: {
            id: string;
            description: string | null;
            type: string;
            mime_type: string;
            file_url: string;
            file_name: string;
            original_name: string;
            size_bytes: number | null;
            claim_id: string;
            uploaded_by_user_id: string | null;
            uploaded_at: Date;
        }[];
        invoice: {
            id: string;
            status: string;
            invoice_number: string;
            total_amount: import("@prisma/client-runtime-utils").Decimal;
        };
        patient_insurance: {
            plan: {
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
        pre_auth: {
            id: string;
            status: string;
            valid_from: Date | null;
            valid_to: Date | null;
            submission_method: string | null;
            submitted_at: Date | null;
            approval_code: string | null;
            approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        } | null;
        status_history: {
            id: string;
            note: string | null;
            from_status: string | null;
            to_status: string;
            changed_by_user_id: string | null;
            changed_at: Date;
            claim_id: string;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        currency: string;
        notes: string | null;
        paid_at: Date | null;
        approved_amount: import("@prisma/client-runtime-utils").Decimal | null;
        patient_insurance_id: string;
        invoice_id: string;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        decision_at: Date | null;
        claim_number: string | null;
        pre_auth_code: string | null;
        pre_auth_id: string | null;
        billed_amount: import("@prisma/client-runtime-utils").Decimal;
        patient_portion: import("@prisma/client-runtime-utils").Decimal | null;
        disallowed_amount: import("@prisma/client-runtime-utils").Decimal | null;
        paid_amount: import("@prisma/client-runtime-utils").Decimal | null;
        rejection_reason: string | null;
        query_text: string | null;
        query_response_at: Date | null;
        claim_form_url: string | null;
        consolidated_package_url: string | null;
    }>;
    submit(clinicId: string, user: {
        sub: string;
    }, id: string, dto: SubmitClaimDto): Promise<{
        attachments: {
            id: string;
            description: string | null;
            type: string;
            mime_type: string;
            file_url: string;
            file_name: string;
            original_name: string;
            size_bytes: number | null;
            claim_id: string;
            uploaded_by_user_id: string | null;
            uploaded_at: Date;
        }[];
        invoice: {
            id: string;
            status: string;
            invoice_number: string;
            total_amount: import("@prisma/client-runtime-utils").Decimal;
        };
        patient_insurance: {
            plan: {
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
        pre_auth: {
            id: string;
            status: string;
            valid_from: Date | null;
            valid_to: Date | null;
            submission_method: string | null;
            submitted_at: Date | null;
            approval_code: string | null;
            approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        } | null;
        status_history: {
            id: string;
            note: string | null;
            from_status: string | null;
            to_status: string;
            changed_by_user_id: string | null;
            changed_at: Date;
            claim_id: string;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        currency: string;
        notes: string | null;
        paid_at: Date | null;
        approved_amount: import("@prisma/client-runtime-utils").Decimal | null;
        patient_insurance_id: string;
        invoice_id: string;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        decision_at: Date | null;
        claim_number: string | null;
        pre_auth_code: string | null;
        pre_auth_id: string | null;
        billed_amount: import("@prisma/client-runtime-utils").Decimal;
        patient_portion: import("@prisma/client-runtime-utils").Decimal | null;
        disallowed_amount: import("@prisma/client-runtime-utils").Decimal | null;
        paid_amount: import("@prisma/client-runtime-utils").Decimal | null;
        rejection_reason: string | null;
        query_text: string | null;
        query_response_at: Date | null;
        claim_form_url: string | null;
        consolidated_package_url: string | null;
    }>;
    updateStatus(clinicId: string, user: {
        sub: string;
    }, id: string, dto: UpdateClaimStatusDto): Promise<{
        attachments: {
            id: string;
            description: string | null;
            type: string;
            mime_type: string;
            file_url: string;
            file_name: string;
            original_name: string;
            size_bytes: number | null;
            claim_id: string;
            uploaded_by_user_id: string | null;
            uploaded_at: Date;
        }[];
        invoice: {
            id: string;
            status: string;
            invoice_number: string;
            total_amount: import("@prisma/client-runtime-utils").Decimal;
        };
        patient_insurance: {
            plan: {
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
        pre_auth: {
            id: string;
            status: string;
            valid_from: Date | null;
            valid_to: Date | null;
            submission_method: string | null;
            submitted_at: Date | null;
            approval_code: string | null;
            approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        } | null;
        status_history: {
            id: string;
            note: string | null;
            from_status: string | null;
            to_status: string;
            changed_by_user_id: string | null;
            changed_at: Date;
            claim_id: string;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        currency: string;
        notes: string | null;
        paid_at: Date | null;
        approved_amount: import("@prisma/client-runtime-utils").Decimal | null;
        patient_insurance_id: string;
        invoice_id: string;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        decision_at: Date | null;
        claim_number: string | null;
        pre_auth_code: string | null;
        pre_auth_id: string | null;
        billed_amount: import("@prisma/client-runtime-utils").Decimal;
        patient_portion: import("@prisma/client-runtime-utils").Decimal | null;
        disallowed_amount: import("@prisma/client-runtime-utils").Decimal | null;
        paid_amount: import("@prisma/client-runtime-utils").Decimal | null;
        rejection_reason: string | null;
        query_text: string | null;
        query_response_at: Date | null;
        claim_form_url: string | null;
        consolidated_package_url: string | null;
    }>;
    recordPayment(clinicId: string, user: {
        sub: string;
    }, id: string, dto: RecordClaimPaymentDto): Promise<{
        attachments: {
            id: string;
            description: string | null;
            type: string;
            mime_type: string;
            file_url: string;
            file_name: string;
            original_name: string;
            size_bytes: number | null;
            claim_id: string;
            uploaded_by_user_id: string | null;
            uploaded_at: Date;
        }[];
        invoice: {
            id: string;
            status: string;
            invoice_number: string;
            total_amount: import("@prisma/client-runtime-utils").Decimal;
        };
        patient_insurance: {
            plan: {
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
        pre_auth: {
            id: string;
            status: string;
            valid_from: Date | null;
            valid_to: Date | null;
            submission_method: string | null;
            submitted_at: Date | null;
            approval_code: string | null;
            approved_amount_cap: import("@prisma/client-runtime-utils").Decimal | null;
        } | null;
        status_history: {
            id: string;
            note: string | null;
            from_status: string | null;
            to_status: string;
            changed_by_user_id: string | null;
            changed_at: Date;
            claim_id: string;
        }[];
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        currency: string;
        notes: string | null;
        paid_at: Date | null;
        approved_amount: import("@prisma/client-runtime-utils").Decimal | null;
        patient_insurance_id: string;
        invoice_id: string;
        submission_method: string | null;
        submission_ref: string | null;
        submitted_at: Date | null;
        submitted_by_user_id: string | null;
        decision_at: Date | null;
        claim_number: string | null;
        pre_auth_code: string | null;
        pre_auth_id: string | null;
        billed_amount: import("@prisma/client-runtime-utils").Decimal;
        patient_portion: import("@prisma/client-runtime-utils").Decimal | null;
        disallowed_amount: import("@prisma/client-runtime-utils").Decimal | null;
        paid_amount: import("@prisma/client-runtime-utils").Decimal | null;
        rejection_reason: string | null;
        query_text: string | null;
        query_response_at: Date | null;
        claim_form_url: string | null;
        consolidated_package_url: string | null;
    }>;
}
