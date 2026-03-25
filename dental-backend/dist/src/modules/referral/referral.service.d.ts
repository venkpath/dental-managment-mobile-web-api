import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import type { CompleteReferralDto } from './dto/index.js';
export declare class ReferralService {
    private readonly prisma;
    private readonly communicationService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService);
    getOrCreateReferralCode(clinicId: string, patientId: string): Promise<{
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
            branch_id: string;
            first_name: string;
            last_name: string;
            gender: string;
            date_of_birth: Date | null;
            age: number | null;
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
            branch_id: string;
            first_name: string;
            last_name: string;
            gender: string;
            date_of_birth: Date | null;
            age: number | null;
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
        reward_type: string | null;
        reward_value: import("@prisma/client-runtime-utils").Decimal | null;
        referred_patient_id: string | null;
        referrer_patient_id: string;
        referral_code_id: string;
        reward_status: string | null;
    }>;
    creditReward(clinicId: string, referralId: string): Promise<{
        id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        reward_type: string | null;
        reward_value: import("@prisma/client-runtime-utils").Decimal | null;
        referred_patient_id: string | null;
        referrer_patient_id: string;
        referral_code_id: string;
        reward_status: string | null;
    }>;
    getStats(clinicId: string): Promise<{
        total: number;
        completed: number;
        rewarded: number;
        pending_rewards: number;
    }>;
    getLeaderboard(clinicId: string, limit?: number): Promise<{
        patient: {
            id: string;
            phone: string;
            first_name: string;
            last_name: string;
        } | undefined;
        referral_count: number;
    }[]>;
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
        reward_type: string | null;
        reward_value: import("@prisma/client-runtime-utils").Decimal | null;
        referred_patient_id: string | null;
        referrer_patient_id: string;
        referral_code_id: string;
        reward_status: string | null;
    })[]>;
    private generateCode;
}
