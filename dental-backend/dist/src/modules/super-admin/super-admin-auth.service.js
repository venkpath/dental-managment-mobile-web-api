"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const password_service_js_1 = require("../../common/services/password.service.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const super_admin_service_js_1 = require("./super-admin.service.js");
let SuperAdminAuthService = class SuperAdminAuthService {
    superAdminService;
    passwordService;
    jwtService;
    prisma;
    constructor(superAdminService, passwordService, jwtService, prisma) {
        this.superAdminService = superAdminService;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
        this.prisma = prisma;
    }
    async login(dto) {
        const admin = await this.superAdminService.findByEmail(dto.email);
        if (!admin) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (admin.status !== 'active') {
            throw new common_1.UnauthorizedException('Account is inactive');
        }
        const passwordValid = await this.passwordService.verify(dto.password, admin.password_hash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const payload = {
            sub: admin.id,
            type: 'super_admin',
        };
        return {
            access_token: await this.jwtService.signAsync(payload),
            super_admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
            },
        };
    }
    async impersonate(clinicId) {
        const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found');
        const adminUser = await this.prisma.user.findFirst({
            where: { clinic_id: clinicId, role: 'Admin' },
        });
        if (!adminUser)
            throw new common_1.NotFoundException('No admin user found for this clinic');
        const payload = {
            sub: adminUser.id,
            type: 'user',
            clinic_id: clinicId,
            role: adminUser.role,
            branch_id: adminUser.branch_id,
        };
        return {
            access_token: await this.jwtService.signAsync(payload, { expiresIn: '2h' }),
            clinic: { id: clinic.id, name: clinic.name },
            user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
        };
    }
};
exports.SuperAdminAuthService = SuperAdminAuthService;
exports.SuperAdminAuthService = SuperAdminAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [super_admin_service_js_1.SuperAdminService,
        password_service_js_1.PasswordService,
        jwt_1.JwtService,
        prisma_service_js_1.PrismaService])
], SuperAdminAuthService);
//# sourceMappingURL=super-admin-auth.service.js.map