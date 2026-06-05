import { InsuranceReimbursementService } from '../services/insurance-reimbursement.service.js';
import { CreateReimbursementDto } from '../dto/create-claim.dto.js';
export declare class InsuranceReimbursementController {
    private readonly reimbursementService;
    constructor(reimbursementService: InsuranceReimbursementService);
    findAll(clinicId: string, from?: string, to?: string, skip?: number, take?: number): Promise<{
        total: number;
        items: ({
            allocations: ({
                claim: {
                    invoice: {
                        id: string;
                        invoice_number: string;
                    };
                    patient_insurance: {
                        plan: {
                            provider: {
                                id: string;
                                name: string;
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
                };
            } & {
                id: string;
                created_at: Date;
                disallowed_amount: import("@prisma/client-runtime-utils").Decimal;
                claim_id: string;
                allocated_amount: import("@prisma/client-runtime-utils").Decimal;
                disallowance_reason: string | null;
                action_taken: string;
                reimbursement_id: string;
            })[];
            recorded_by: never;
        } & {
            id: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            currency: string;
            notes: string | null;
            received_at: Date;
            amount_received: import("@prisma/client-runtime-utils").Decimal;
            tds_deducted: import("@prisma/client-runtime-utils").Decimal;
            bank_utr_ref: string | null;
            proof_document_url: string | null;
            recorded_by_user_id: string | null;
        })[];
    }>;
    findOne(clinicId: string, id: string): Promise<{
        allocations: ({
            claim: {
                invoice: {
                    id: string;
                    invoice_number: string;
                };
                patient_insurance: {
                    plan: {
                        provider: {
                            id: string;
                            name: string;
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
            };
        } & {
            id: string;
            created_at: Date;
            disallowed_amount: import("@prisma/client-runtime-utils").Decimal;
            claim_id: string;
            allocated_amount: import("@prisma/client-runtime-utils").Decimal;
            disallowance_reason: string | null;
            action_taken: string;
            reimbursement_id: string;
        })[];
        recorded_by: never;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        currency: string;
        notes: string | null;
        received_at: Date;
        amount_received: import("@prisma/client-runtime-utils").Decimal;
        tds_deducted: import("@prisma/client-runtime-utils").Decimal;
        bank_utr_ref: string | null;
        proof_document_url: string | null;
        recorded_by_user_id: string | null;
    }>;
    create(clinicId: string, user: {
        sub: string;
    }, dto: CreateReimbursementDto): Promise<({
        allocations: ({
            claim: {
                invoice: {
                    id: string;
                    invoice_number: string;
                };
                patient_insurance: {
                    plan: {
                        provider: {
                            id: string;
                            name: string;
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
            };
        } & {
            id: string;
            created_at: Date;
            disallowed_amount: import("@prisma/client-runtime-utils").Decimal;
            claim_id: string;
            allocated_amount: import("@prisma/client-runtime-utils").Decimal;
            disallowance_reason: string | null;
            action_taken: string;
            reimbursement_id: string;
        })[];
        recorded_by: never;
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        currency: string;
        notes: string | null;
        received_at: Date;
        amount_received: import("@prisma/client-runtime-utils").Decimal;
        tds_deducted: import("@prisma/client-runtime-utils").Decimal;
        bank_utr_ref: string | null;
        proof_document_url: string | null;
        recorded_by_user_id: string | null;
    }) | null>;
}
