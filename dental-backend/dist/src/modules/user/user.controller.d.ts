import { UserService } from './user.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(clinicId: string, dto: CreateUserDto): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        clinic_id: string;
        role: string;
        email_verified: boolean;
        phone_verified: boolean;
        license_number: string | null;
        signature_url: string | null;
        branch_id: string | null;
    }, "password_hash">>;
    findAll(clinicId: string, role?: string, search?: string, branchId?: string): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        clinic_id: string;
        role: string;
        email_verified: boolean;
        phone_verified: boolean;
        license_number: string | null;
        signature_url: string | null;
        branch_id: string | null;
    }, "password_hash">[]>;
    findOne(clinicId: string, id: string): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        clinic_id: string;
        role: string;
        email_verified: boolean;
        phone_verified: boolean;
        license_number: string | null;
        signature_url: string | null;
        branch_id: string | null;
    }, "password_hash">>;
    update(clinicId: string, id: string, dto: UpdateUserDto): Promise<Omit<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        status: string;
        created_at: Date;
        updated_at: Date;
        phone: string | null;
        clinic_id: string;
        role: string;
        email_verified: boolean;
        phone_verified: boolean;
        license_number: string | null;
        signature_url: string | null;
        branch_id: string | null;
    }, "password_hash">>;
    remove(clinicId: string, id: string): Promise<{
        message: string;
    }>;
    uploadSignature(clinicId: string, id: string, file: Express.Multer.File): Promise<{
        signature_url: string;
    }>;
}
