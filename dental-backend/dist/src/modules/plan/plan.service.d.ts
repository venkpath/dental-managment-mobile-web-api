import { PrismaService } from '../../database/prisma.service.js';
import { CreatePlanDto, UpdatePlanDto, AssignFeaturesDto } from './dto/index.js';
import { Plan, PlanFeature } from '@prisma/client';
export declare class PlanService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreatePlanDto): Promise<Plan>;
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
    findOne(id: string): Promise<Plan>;
    update(id: string, dto: UpdatePlanDto): Promise<Plan>;
    assignFeatures(planId: string, dto: AssignFeaturesDto): Promise<PlanFeature[]>;
    getFeatures(planId: string): Promise<PlanFeature[]>;
    remove(id: string): Promise<Plan>;
}
