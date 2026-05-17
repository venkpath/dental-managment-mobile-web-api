import { PrismaService } from '../../database/prisma.service.js';
import { ClinicFeatureService } from '../feature/clinic-feature.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';
import { Clinic } from '@prisma/client';
export declare class ClinicService {
    private readonly prisma;
    private readonly clinicFeatureService;
    constructor(prisma: PrismaService, clinicFeatureService: ClinicFeatureService);
    create(dto: CreateClinicDto): Promise<Clinic>;
    findAll(): Promise<Clinic[]>;
    findOne(id: string): Promise<Clinic>;
    getFeatures(clinicId: string): Promise<{
        plan: {
            max_branches: number | null;
            max_staff: number | null;
            ai_quota: number | null;
            max_patients_per_month: number | null;
            max_appointments_per_month: number | null;
            max_invoices_per_month: number | null;
            max_treatments_per_month: number | null;
            max_prescriptions_per_month: number | null;
            max_consultations_per_month: number | null;
            name: string;
            price_monthly: number;
            effective_price: number | null;
            price_source: "plan" | "none" | "custom";
            custom_price_expires_at: Date | null;
        } | null;
        features: string[];
    }>;
    update(id: string, dto: UpdateClinicDto): Promise<Clinic>;
    updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<Clinic>;
}
