import { PatientService } from './patient.service.js';
import { CreatePatientDto, UpdatePatientDto, QueryPatientDto, BulkImportDto } from './dto/index.js';
export declare class PatientController {
    private readonly patientService;
    constructor(patientService: PatientService);
    create(clinicId: string, dto: CreatePatientDto): Promise<{
        id: string;
        email: string | null;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_id: string;
        branch_id: string;
        first_name: string;
        last_name: string;
        gender: string;
        date_of_birth: Date | null;
        age: number | null;
        blood_group: string | null;
        medical_history: import("@prisma/client/runtime/client").JsonValue | null;
        allergies: string | null;
        notes: string | null;
        preferred_language: string;
    }>;
    findAll(clinicId: string, query: QueryPatientDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        id: string;
        email: string | null;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_id: string;
        branch_id: string;
        first_name: string;
        last_name: string;
        gender: string;
        date_of_birth: Date | null;
        age: number | null;
        blood_group: string | null;
        medical_history: import("@prisma/client/runtime/client").JsonValue | null;
        allergies: string | null;
        notes: string | null;
        preferred_language: string;
    }>>;
    findOne(clinicId: string, id: string): Promise<{
        id: string;
        email: string | null;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_id: string;
        branch_id: string;
        first_name: string;
        last_name: string;
        gender: string;
        date_of_birth: Date | null;
        age: number | null;
        blood_group: string | null;
        medical_history: import("@prisma/client/runtime/client").JsonValue | null;
        allergies: string | null;
        notes: string | null;
        preferred_language: string;
    }>;
    update(clinicId: string, id: string, dto: UpdatePatientDto): Promise<{
        id: string;
        email: string | null;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_id: string;
        branch_id: string;
        first_name: string;
        last_name: string;
        gender: string;
        date_of_birth: Date | null;
        age: number | null;
        blood_group: string | null;
        medical_history: import("@prisma/client/runtime/client").JsonValue | null;
        allergies: string | null;
        notes: string | null;
        preferred_language: string;
    }>;
    remove(clinicId: string, id: string): Promise<{
        id: string;
        email: string | null;
        created_at: Date;
        updated_at: Date;
        phone: string;
        clinic_id: string;
        branch_id: string;
        first_name: string;
        last_name: string;
        gender: string;
        date_of_birth: Date | null;
        age: number | null;
        blood_group: string | null;
        medical_history: import("@prisma/client/runtime/client").JsonValue | null;
        allergies: string | null;
        notes: string | null;
        preferred_language: string;
    }>;
    importFromFile(clinicId: string, file: Express.Multer.File, branchId: string): Promise<{
        created: number;
        skipped: number;
        errors: {
            row: number;
            reason: string;
        }[];
    }>;
    importBulk(clinicId: string, dto: BulkImportDto): Promise<{
        created: number;
        skipped: number;
        errors: {
            row: number;
            reason: string;
        }[];
    }>;
    importFromImage(clinicId: string, file: Express.Multer.File, branchId: string): Promise<{
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
