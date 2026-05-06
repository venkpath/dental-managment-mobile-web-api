export declare class RegisterClinicDto {
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
    is_doctor?: boolean;
    plan_key?: string;
    billing_cycle?: 'monthly' | 'yearly';
}
