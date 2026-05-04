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
        max_invoices_per_month: number | null;
        price_monthly: import("@prisma/client-runtime-utils").Decimal;
        price_yearly: import("@prisma/client-runtime-utils").Decimal | null;
        max_branches: number;
        max_staff: number;
        ai_quota: number;
        ai_overage_cap: number;
        max_patients_per_month: number | null;
        max_appointments_per_month: number | null;
        max_treatments_per_month: number | null;
        max_prescriptions_per_month: number | null;
        max_consultations_per_month: number | null;
        whatsapp_included_monthly: number | null;
        whatsapp_hard_limit_monthly: number | null;
        allow_whatsapp_overage_billing: boolean;
        razorpay_plan_id: string | null;
        razorpay_plan_id_yearly: string | null;
    })[]>;
    findOne(id: string): Promise<Plan>;
    update(id: string, dto: UpdatePlanDto): Promise<Plan>;
    assignFeatures(planId: string, dto: AssignFeaturesDto): Promise<PlanFeature[]>;
    getFeatures(planId: string): Promise<PlanFeature[]>;
    remove(id: string): Promise<Plan>;
}
