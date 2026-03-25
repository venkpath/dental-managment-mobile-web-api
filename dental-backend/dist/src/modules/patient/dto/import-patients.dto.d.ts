export declare class ImportPatientRow {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    gender?: string;
    age?: number | string;
    date_of_birth?: string;
    blood_group?: string;
    allergies?: string;
    notes?: string;
}
export declare class BulkImportDto {
    branch_id: string;
    patients: ImportPatientRow[];
}
export declare class ImageImportDto {
    branch_id: string;
}
