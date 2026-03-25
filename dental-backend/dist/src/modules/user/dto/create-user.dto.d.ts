export declare enum UserRole {
    ADMIN = "Admin",
    DENTIST = "Dentist",
    RECEPTIONIST = "Receptionist"
}
export declare class CreateUserDto {
    branch_id?: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
}
