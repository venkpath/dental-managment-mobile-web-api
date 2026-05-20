export declare enum InvoiceStatus {
    PENDING = "pending",
    PARTIALLY_PAID = "partially_paid",
    PAID = "paid"
}
export declare enum InvoiceItemType {
    TREATMENT = "treatment",
    SERVICE = "service",
    PHARMACY = "pharmacy"
}
export declare enum CoverageCategory {
    PREVENTIVE = "preventive",
    BASIC = "basic",
    MAJOR = "major",
    ORTHO = "ortho",
    EMERGENCY = "emergency"
}
export declare class InvoiceItemDto {
    treatment_id?: string;
    item_type: InvoiceItemType;
    description: string;
    quantity: number;
    unit_price: number;
    coverage_category?: CoverageCategory;
    scheme_max_fee?: number;
}
export declare class CreateInvoiceDto {
    branch_id: string;
    patient_id: string;
    dentist_id?: string;
    treatment_date?: string;
    tax_percentage?: number;
    discount_amount?: number;
    gst_number?: string;
    tax_breakdown?: Record<string, unknown>;
    as_draft?: boolean;
    patient_insurance_id?: string;
    override_insurance_covered_amount?: number;
    override_patient_copay_amount?: number;
    items: InvoiceItemDto[];
}
