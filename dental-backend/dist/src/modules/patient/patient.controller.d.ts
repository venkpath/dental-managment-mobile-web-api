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
        profile_photo_url: string | null;
        branch_id: string;
        age: number | null;
        gender: string;
        first_name: string;
        last_name: string;
        date_of_birth: Date | null;
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
        profile_photo_url: string | null;
        branch_id: string;
        age: number | null;
        gender: string;
        first_name: string;
        last_name: string;
        date_of_birth: Date | null;
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
        profile_photo_url: string | null;
        branch_id: string;
        age: number | null;
        gender: string;
        first_name: string;
        last_name: string;
        date_of_birth: Date | null;
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
        profile_photo_url: string | null;
        branch_id: string;
        age: number | null;
        gender: string;
        first_name: string;
        last_name: string;
        date_of_birth: Date | null;
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
        profile_photo_url: string | null;
        branch_id: string;
        age: number | null;
        gender: string;
        first_name: string;
        last_name: string;
        date_of_birth: Date | null;
        blood_group: string | null;
        medical_history: import("@prisma/client/runtime/client").JsonValue | null;
        allergies: string | null;
        notes: string | null;
        preferred_language: string;
    }>;
    uploadProfilePhoto(clinicId: string, id: string, file: Express.Multer.File): Promise<{
        profile_photo_url: string;
    }>;
    deleteProfilePhoto(clinicId: string, id: string): Promise<{
        message: string;
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
