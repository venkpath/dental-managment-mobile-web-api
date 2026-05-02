import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { User } from '@prisma/client';
export declare class UserService {
    private readonly prisma;
    private readonly passwordService;
    private readonly s3Service;
    constructor(prisma: PrismaService, passwordService: PasswordService, s3Service: S3Service);
    private withSignedUrls;
    uploadSignature(clinicId: string, userId: string, file: {
        buffer: Buffer;
        mimetype: string;
        size: number;
        originalname?: string;
    }): Promise<{
        signature_url: string;
    }>;
    uploadProfilePhoto(clinicId: string, userId: string, file: {
        buffer: Buffer;
        mimetype: string;
        size: number;
        originalname?: string;
    }): Promise<{
        profile_photo_url: string;
    }>;
    deleteProfilePhoto(clinicId: string, userId: string): Promise<{
        message: string;
    }>;
    create(clinicId: string, dto: CreateUserDto): Promise<Omit<User, 'password_hash'>>;
    findByEmail(email: string, clinicId: string): Promise<User | null>;
    findAll(clinicId: string, role?: string, search?: string, branchId?: string): Promise<Omit<User, 'password_hash'>[]>;
    findOne(clinicId: string, id: string): Promise<Omit<User, 'password_hash'>>;
    remove(clinicId: string, id: string): Promise<{
        message: string;
    }>;
    update(clinicId: string, id: string, dto: UpdateUserDto): Promise<Omit<User, 'password_hash'>>;
}
