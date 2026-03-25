import { PrismaService } from '../../database/prisma.service.js';
import { CreatePrescriptionDto, UpdatePrescriptionDto, QueryPrescriptionDto } from './dto/index.js';
import { Prescription } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
export declare class PrescriptionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(clinicId: string, dto: CreatePrescriptionDto): Promise<Prescription>;
    findAll(clinicId: string, query: QueryPrescriptionDto): Promise<PaginatedResult<Prescription>>;
    findOne(clinicId: string, id: string): Promise<Prescription>;
    update(clinicId: string, id: string, dto: UpdatePrescriptionDto): Promise<Prescription>;
    findByPatient(clinicId: string, patientId: string): Promise<Prescription[]>;
}
