import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePatientDto, UpdatePatientDto, QueryPatientDto, ImportPatientRow } from './dto/index.js';
import { Patient } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';
export declare class PatientService {
    private readonly prisma;
    private readonly config;
    private readonly planLimit;
    private readonly logger;
    private readonly openai;
    constructor(prisma: PrismaService, config: ConfigService, planLimit: PlanLimitService);
    create(clinicId: string, dto: CreatePatientDto): Promise<Patient>;
    findAll(clinicId: string, query: QueryPatientDto): Promise<PaginatedResult<Patient>>;
    findOne(clinicId: string, id: string): Promise<Patient>;
    update(clinicId: string, id: string, dto: UpdatePatientDto): Promise<Patient>;
    remove(clinicId: string, id: string): Promise<Patient>;
    parseFile(buffer: Buffer, mimetype: string): ImportPatientRow[];
    private parseCsv;
    private parseExcel;
    private normalizeRow;
    private normalizeGender;
    bulkImport(clinicId: string, branchId: string, rows: ImportPatientRow[]): Promise<{
        created: number;
        skipped: number;
        errors: Array<{
            row: number;
            reason: string;
        }>;
    }>;
    extractPatientsFromImage(clinicId: string, branchId: string, imageBuffer: Buffer, mimetype: string): Promise<{
        extracted: {
            first_name: string;
            last_name: string;
            phone: string;
            email: string | undefined;
            gender: string;
            age: number | undefined;
            notes: string | undefined;
        }[];
        total: number;
    }>;
}
