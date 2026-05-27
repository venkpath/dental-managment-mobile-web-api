export declare enum UserRole {
    SUPER_ADMIN = "SuperAdmin",
    ADMIN = "Admin",
    DENTIST = "Dentist",
    RECEPTIONIST = "Receptionist",
    STAFF = "Staff",
    CONSULTANT = "Consultant"
}
export declare class CreateUserDto {
    branch_id?: string;
    name: string;
    email: string;
    password?: string;
    phone?: string;
    role: UserRole;
    is_doctor?: boolean;
    listed_in_directory?: boolean;
    license_number?: string;
    signature_url?: string;
    bio?: string;
    years_experience?: number;
    specializations?: string[];
    languages_spoken?: string;
    consultation_fee?: number;
}
