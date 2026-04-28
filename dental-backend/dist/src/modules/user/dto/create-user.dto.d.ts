export declare enum UserRole {
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
    license_number?: string;
    signature_url?: string;
}
