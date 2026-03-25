export declare enum Gender {
    MALE = "Male",
    FEMALE = "Female",
    OTHER = "Other"
}
export declare class CreatePatientDto {
    branch_id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    gender: Gender;
    date_of_birth?: string;
    age?: number;
    blood_group?: string;
    medical_history?: Record<string, unknown>;
    allergies?: string;
    notes?: string;
}
