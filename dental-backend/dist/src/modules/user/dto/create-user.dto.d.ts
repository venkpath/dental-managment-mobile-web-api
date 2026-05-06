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
    license_number?: string;
    signature_url?: string;
}
