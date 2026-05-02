import { ReferralService } from './referral.service.js';
import { CompleteReferralDto } from './dto/index.js';
export declare class ReferralController {
    private readonly referralService;
    constructor(referralService: ReferralService);
    getOrCreateCode(clinicId: string, patientId: string): Promise<{
        id: string;
        created_at: Date;
        code: string;
        clinic_id: string;
        is_active: boolean;
        patient_id: string;
    }>;
    deactivateCode(clinicId: string, codeId: string): Promise<{
        id: string;
        created_at: Date;
        code: string;
        clinic_id: string;
        is_active: boolean;
        patient_id: string;
    }>;
    completeReferral(clinicId: string, dto: CompleteReferralDto): Promise<{
        referrer: {
            id: string;
            email: string | null;
            created_at: Date;
            updated_at: Date;
            phone: string;
            clinic_id: string;
            profile_photo_url: string | null;
            branch_id: string;
            age: number | null;
            gender: string;
            first_name: string;
            last_name: string;
            date_of_birth: Date | null;
            blood_group: string | null;
            medical_history: import("@prisma/client/runtime/client").JsonValue | null;
            allergies: string | null;
            notes: string | null;
            preferred_language: string;
        };
        referred: {
            id: string;
            email: string | null;
            created_at: Date;
            updated_at: Date;
            phone: string;
            clinic_id: string;
            profile_photo_url: string | null;
            branch_id: string;
            age: number | null;
            gender: string;
            first_name: string;
            last_name: string;
            date_of_birth: Date | null;
            blood_group: string | null;
            medical_history: import("@prisma/client/runtime/client").JsonValue | null;
            allergies: string | null;
            notes: string | null;
            preferred_language: string;
        } | null;
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        referrer_patient_id: string;
        referred_patient_id: string | null;
        referral_code_id: string;
        reward_type: string | null;
        reward_value: import("@prisma/client-runtime-utils").Decimal | null;
        reward_status: string | null;
    }>;
    creditReward(clinicId: string, referralId: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        referrer_patient_id: string;
        referred_patient_id: string | null;
        referral_code_id: string;
        reward_type: string | null;
        reward_value: import("@prisma/client-runtime-utils").Decimal | null;
        reward_status: string | null;
    }>;
    getStats(clinicId: string): Promise<{
        total: number;
        completed: number;
        rewarded: number;
        pending_rewards: number;
    }>;
    getDetailedAnalytics(clinicId: string, startDate?: string, endDate?: string): Promise<{
        summary: {
            total_referrals: number;
            completed: number;
            rewarded: number;
            pending_rewards: number;
            conversion_rate: number;
            attributed_revenue: number;
        };
        top_referrers: {
            patient: {
                id: string;
                first_name: string;
                last_name: string;
            } | undefined;
            referral_count: number;
            total_reward_value: number;
        }[];
        monthly_trend: {
            month: string;
            referral_count: number;
            completed_count: number;
        }[];
    }>;
    getLeaderboard(clinicId: string, limit?: string): Promise<{
        patient: {
            id: string;
            phone: string;
            first_name: string;
            last_name: string;
        } | undefined;
        referral_count: number;
    }[]>;
    getPatientReferrals(clinicId: string, patientId: string): Promise<({
        referred: {
            id: string;
            first_name: string;
            last_name: string;
        } | null;
    } & {
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        referrer_patient_id: string;
        referred_patient_id: string | null;
        referral_code_id: string;
        reward_type: string | null;
        reward_value: import("@prisma/client-runtime-utils").Decimal | null;
        reward_status: string | null;
    })[]>;
}
