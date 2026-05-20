declare const STATUSES: readonly ["ACTIVE", "EXPIRED", "SUSPENDED", "PENDING"];
export type EmpanelmentStatus = (typeof STATUSES)[number];
export declare class CreateEmpanelmentDto {
    provider_id: string;
    empanelment_number: string;
    valid_from?: string;
    valid_to?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_name?: string;
    contact_person_name?: string;
    contact_person_phone?: string;
    contact_person_email?: string;
    notes?: string;
    status?: EmpanelmentStatus;
}
export {};
