import { PrismaService } from '../../database/prisma.service.js';
import { CreateBranchDto, UpdateBranchDto, UpdateBranchSchedulingDto } from './dto/index.js';
import { Branch } from '@prisma/client';
export declare class BranchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(clinicId: string, dto: CreateBranchDto): Promise<Branch>;
    findAll(clinicId: string): Promise<Branch[]>;
    findOne(clinicId: string, id: string): Promise<Branch>;
    update(clinicId: string, id: string, dto: UpdateBranchDto): Promise<Branch>;
    updateSchedulingSettings(clinicId: string, id: string, dto: UpdateBranchSchedulingDto): Promise<Branch>;
    getSchedulingSettings(clinicId: string, id: string): Promise<{
        working_start_time: string;
        working_end_time: string;
        lunch_start_time: string | null;
        lunch_end_time: string | null;
        slot_duration: number;
        default_appt_duration: number;
        buffer_minutes: number;
        advance_booking_days: number;
        working_days: string;
    }>;
}
