export declare class CreateReferralSettingsDto {
    reward_type?: string;
    reward_value?: number;
    referral_message?: string;
}
export declare class CompleteReferralDto {
    referral_code: string;
    referred_patient_id: string;
}
