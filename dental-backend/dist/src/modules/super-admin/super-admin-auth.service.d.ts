import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../common/services/password.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { SuperAdminService } from './super-admin.service.js';
import { LoginSuperAdminDto } from './dto/index.js';
export interface SuperAdminLoginResponse {
    access_token: string;
    super_admin: {
        id: string;
        name: string;
        email: string;
    };
}
export declare class SuperAdminAuthService {
    private readonly superAdminService;
    private readonly passwordService;
    private readonly jwtService;
    private readonly prisma;
    constructor(superAdminService: SuperAdminService, passwordService: PasswordService, jwtService: JwtService, prisma: PrismaService);
    login(dto: LoginSuperAdminDto): Promise<SuperAdminLoginResponse>;
    impersonate(clinicId: string): Promise<{
        access_token: string;
        clinic: {
            id: string;
            name: string;
        };
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
}
