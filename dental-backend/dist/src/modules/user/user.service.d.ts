import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { User } from '@prisma/client';
export declare class UserService {
    private readonly prisma;
    private readonly passwordService;
    constructor(prisma: PrismaService, passwordService: PasswordService);
    create(clinicId: string, dto: CreateUserDto): Promise<Omit<User, 'password_hash'>>;
    findByEmail(email: string, clinicId: string): Promise<User | null>;
    findAll(clinicId: string, role?: string, search?: string, branchId?: string): Promise<Omit<User, 'password_hash'>[]>;
    findOne(clinicId: string, id: string): Promise<Omit<User, 'password_hash'>>;
    update(clinicId: string, id: string, dto: UpdateUserDto): Promise<Omit<User, 'password_hash'>>;
}
