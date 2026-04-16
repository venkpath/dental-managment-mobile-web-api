import { PrescriptionService } from './prescription.service.js';
import { CreatePrescriptionDto, UpdatePrescriptionDto, QueryPrescriptionDto } from './dto/index.js';
export declare class PrescriptionPublicController {
    private readonly prescriptionService;
    constructor(prescriptionService: PrescriptionService);
    prescriptionRedirect(id: string, clinicId: string): Promise<{
        url: string;
        statusCode: number;
    }>;
}
export declare class PrescriptionController {
    private readonly prescriptionService;
    constructor(prescriptionService: PrescriptionService);
    findAll(clinicId: string, query: QueryPrescriptionDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        dentist_id: string;
        clinical_visit_id: string | null;
        diagnosis: string;
        instructions: string | null;
    }>>;
    create(clinicId: string, dto: CreatePrescriptionDto): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        dentist_id: string;
        clinical_visit_id: string | null;
        diagnosis: string;
        instructions: string | null;
    }>;
    findOne(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        dentist_id: string;
        clinical_visit_id: string | null;
        diagnosis: string;
        instructions: string | null;
    }>;
    update(clinicId: string, id: string, dto: UpdatePrescriptionDto): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        dentist_id: string;
        clinical_visit_id: string | null;
        diagnosis: string;
        instructions: string | null;
    }>;
    getPdfUrl(clinicId: string, id: string): Promise<{
        url: string;
    }>;
    sendWhatsApp(clinicId: string, id: string): Promise<{
        message: string;
    }>;
    findByPatient(clinicId: string, patientId: string): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        branch_id: string;
        patient_id: string;
        dentist_id: string;
        clinical_visit_id: string | null;
        diagnosis: string;
        instructions: string | null;
    }[]>;
}
