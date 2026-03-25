import { PrismaService } from '../../database/prisma.service.js';
export interface ClinicDataExport {
    exportedAt: string;
    clinic: Record<string, unknown>;
    branches: Record<string, unknown>[];
    users: Record<string, unknown>[];
    patients: Record<string, unknown>[];
    appointments: Record<string, unknown>[];
    treatments: Record<string, unknown>[];
    prescriptions: Record<string, unknown>[];
    invoices: Record<string, unknown>[];
    inventoryItems: Record<string, unknown>[];
}
export declare class DataExportService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    exportClinicData(clinicId: string): Promise<ClinicDataExport>;
}
