import { PlanService } from './plan.service.js';
import { CreatePlanDto, UpdatePlanDto, AssignFeaturesDto } from './dto/index.js';
export declare class PlanController {
    private readonly planService;
    constructor(planService: PlanService);
    create(dto: CreatePlanDto): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        price_monthly: import("@prisma/client-runtime-utils").Decimal;
        max_branches: number;
        max_staff: number;
        ai_quota: number;
        max_patients_per_month: number | null;
        max_appointments_per_month: number | null;
        razorpay_plan_id: string | null;
    }>;
    findAll(): Promise<({
        plan_features: ({
            feature: {
                id: string;
                created_at: Date;
                key: string;
                description: string;
            };
        } & {
            id: string;
            plan_id: string;
            feature_id: string;
            is_enabled: boolean;
        })[];
    } & {
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        price_monthly: import("@prisma/client-runtime-utils").Decimal;
        max_branches: number;
        max_staff: number;
        ai_quota: number;
        max_patients_per_month: number | null;
        max_appointments_per_month: number | null;
        razorpay_plan_id: string | null;
    })[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        price_monthly: import("@prisma/client-runtime-utils").Decimal;
        max_branches: number;
        max_staff: number;
        ai_quota: number;
        max_patients_per_month: number | null;
        max_appointments_per_month: number | null;
        razorpay_plan_id: string | null;
    }>;
    update(id: string, dto: UpdatePlanDto): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        price_monthly: import("@prisma/client-runtime-utils").Decimal;
        max_branches: number;
        max_staff: number;
        ai_quota: number;
        max_patients_per_month: number | null;
        max_appointments_per_month: number | null;
        razorpay_plan_id: string | null;
    }>;
    assignFeatures(id: string, dto: AssignFeaturesDto): Promise<{
        id: string;
        plan_id: string;
        feature_id: string;
        is_enabled: boolean;
    }[]>;
    getFeatures(id: string): Promise<{
        id: string;
        plan_id: string;
        feature_id: string;
        is_enabled: boolean;
    }[]>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        price_monthly: import("@prisma/client-runtime-utils").Decimal;
        max_branches: number;
        max_staff: number;
        ai_quota: number;
        max_patients_per_month: number | null;
        max_appointments_per_month: number | null;
        razorpay_plan_id: string | null;
    }>;
}
