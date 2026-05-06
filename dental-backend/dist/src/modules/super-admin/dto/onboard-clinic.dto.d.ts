export declare class OnboardClinicDto {
    clinic_name: string;
    clinic_email: string;
    clinic_phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    admin_name: string;
    admin_email: string;
    admin_phone: string;
    admin_password: string;
    plan_id?: string;
    billing_cycle?: 'monthly' | 'yearly';
    has_own_waba?: boolean;
    is_doctor?: boolean;
}
