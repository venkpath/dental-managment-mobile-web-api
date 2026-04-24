import { PrismaService } from '../../database/prisma.service.js';
import { CreateToothConditionDto, UpdateToothConditionDto } from './dto/index.js';
import { PatientToothCondition } from '@prisma/client';
export declare class ToothChartService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getTeeth(): Promise<{
        id: string;
        name: string;
        fdi_number: number;
        quadrant: number;
        position: number;
    }[]>;
    getSurfaces(): Promise<{
        id: string;
        name: string;
        code: string;
    }[]>;
    getPatientToothChart(clinicId: string, patientId: string): Promise<{
        teeth: {
            id: string;
            name: string;
            fdi_number: number;
            quadrant: number;
            position: number;
        }[];
        surfaces: {
            id: string;
            name: string;
            code: string;
        }[];
        conditions: ({
            tooth: {
                id: string;
                name: string;
                fdi_number: number;
                quadrant: number;
                position: number;
            };
            dentist: {
                id: string;
                email: string;
                name: string;
                role: string;
            };
            surface: {
                id: string;
                name: string;
                code: string;
            } | null;
        } & {
            id: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            branch_id: string;
            notes: string | null;
            patient_id: string;
            clinical_visit_id: string | null;
            condition: string;
            severity: string | null;
            tooth_id: string;
            surface_id: string | null;
            diagnosed_by: string;
        })[];
        treatments: ({
            dentist: {
                id: string;
                email: string;
                name: string;
                role: string;
            };
        } & {
            id: string;
            status: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            branch_id: string;
            procedure: string;
            tooth_number: string | null;
            notes: string | null;
            patient_id: string;
            cost: import("@prisma/client-runtime-utils").Decimal;
            dentist_id: string;
            clinical_visit_id: string | null;
            treatment_plan_id: string | null;
            diagnosis: string;
        })[];
    }>;
    createCondition(clinicId: string, dto: CreateToothConditionDto): Promise<PatientToothCondition>;
    updateCondition(clinicId: string, id: string, dto: UpdateToothConditionDto): Promise<PatientToothCondition>;
}
