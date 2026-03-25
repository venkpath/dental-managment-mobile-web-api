import { PrismaService } from '../../database/prisma.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';
import { Clinic } from '@prisma/client';
export declare class ClinicService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateClinicDto): Promise<Clinic>;
    findAll(): Promise<Clinic[]>;
    findOne(id: string): Promise<Clinic>;
    update(id: string, dto: UpdateClinicDto): Promise<Clinic>;
    updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<Clinic>;
}
