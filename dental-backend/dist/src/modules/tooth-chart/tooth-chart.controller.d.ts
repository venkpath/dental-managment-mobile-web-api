import { ToothChartService } from './tooth-chart.service.js';
import { CreateToothConditionDto, UpdateToothConditionDto } from './dto/index.js';
export declare class ToothChartController {
    private readonly toothChartService;
    constructor(toothChartService: ToothChartService);
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
            patient_id: string;
            notes: string | null;
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
            cost: import("@prisma/client-runtime-utils").Decimal;
            patient_id: string;
            notes: string | null;
            dentist_id: string;
            diagnosis: string;
        })[];
    }>;
    createCondition(clinicId: string, dto: CreateToothConditionDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        notes: string | null;
        condition: string;
        severity: string | null;
        tooth_id: string;
        surface_id: string | null;
        diagnosed_by: string;
    }>;
    updateCondition(clinicId: string, id: string, dto: UpdateToothConditionDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        notes: string | null;
        condition: string;
        severity: string | null;
        tooth_id: string;
        surface_id: string | null;
        diagnosed_by: string;
    }>;
}
