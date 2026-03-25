import { PrismaService } from '../../database/prisma.service.js';
import { CreateTreatmentDto, UpdateTreatmentDto, QueryTreatmentDto } from './dto/index.js';
import { Treatment } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
export declare class TreatmentService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private static readonly PROCEDURE_CONDITION_MAP;
    create(clinicId: string, dto: CreateTreatmentDto): Promise<Treatment>;
    findAll(clinicId: string, query: QueryTreatmentDto): Promise<PaginatedResult<Treatment>>;
    findByPatient(clinicId: string, patientId: string): Promise<Treatment[]>;
    findOne(clinicId: string, id: string): Promise<Treatment>;
    update(clinicId: string, id: string, dto: UpdateTreatmentDto): Promise<Treatment>;
}
