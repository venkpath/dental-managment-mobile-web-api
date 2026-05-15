export declare class CreatePlanDto {
    name: string;
    price_monthly: number;
    price_yearly?: number;
    max_branches: number;
    max_staff: number;
    ai_quota?: number;
    ai_overage_cap?: number;
    max_patients_per_month?: number;
    max_appointments_per_month?: number;
    max_invoices_per_month?: number;
    max_treatments_per_month?: number;
    max_prescriptions_per_month?: number;
    max_consultations_per_month?: number;
    razorpay_plan_id?: string;
    razorpay_plan_id_yearly?: string;
    whatsapp_included_monthly?: number;
    whatsapp_hard_limit_monthly?: number;
    allow_whatsapp_overage_billing?: boolean;
}
