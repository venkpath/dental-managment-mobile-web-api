import { PrismaService } from '../../database/prisma.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';
import { Clinic } from '@prisma/client';
export declare class ClinicService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateClinicDto): Promise<Clinic>;
    findAll(): Promise<Clinic[]>;
    findOne(id: string): Promise<Clinic>;
    getFeatures(clinicId: string): Promise<{
        plan: {
            name: string;
            price_monthly: number;
            max_branches: number;
            max_staff: number;
            ai_quota: number;
            max_patients_per_month: number | null;
            max_appointments_per_month: number | null;
            max_invoices_per_month: number | null;
            max_treatments_per_month: number | null;
        } | null;
        features: string[];
    }>;
    update(id: string, dto: UpdateClinicDto): Promise<Clinic>;
    updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<Clinic>;
}
