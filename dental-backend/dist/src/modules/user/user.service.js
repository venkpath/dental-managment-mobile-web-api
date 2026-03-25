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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const password_service_js_1 = require("../../common/services/password.service.js");
const userSelect = {
    id: true,
    clinic_id: true,
    branch_id: true,
    name: true,
    email: true,
    role: true,
    status: true,
    created_at: true,
    updated_at: true,
};
let UserService = class UserService {
    prisma;
    passwordService;
    constructor(prisma, passwordService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
    }
    async create(clinicId, dto) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
        });
        if (!clinic) {
            throw new common_1.NotFoundException(`Clinic with ID "${clinicId}" not found`);
        }
        if (dto.branch_id) {
            const branch = await this.prisma.branch.findUnique({
                where: { id: dto.branch_id },
            });
            if (!branch || branch.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
            }
        }
        const existing = await this.prisma.user.findUnique({
            where: { email_clinic_id: { email: dto.email, clinic_id: clinicId } },
        });
        if (existing) {
            throw new common_1.ConflictException('A user with this email already exists in this clinic');
        }
        const { password, ...rest } = dto;
        const finalPassword = password || 'Admin@123';
        return this.prisma.user.create({
            data: { ...rest, clinic_id: clinicId, password_hash: await this.passwordService.hash(finalPassword) },
            select: userSelect,
        });
    }
    async findByEmail(email, clinicId) {
        return this.prisma.user.findUnique({
            where: { email_clinic_id: { email, clinic_id: clinicId } },
        });
    }
    async findAll(clinicId, role, search, branchId) {
        const where = { clinic_id: clinicId };
        if (role)
            where.role = role;
        if (branchId)
            where.branch_id = branchId;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.user.findMany({
            where,
            orderBy: { created_at: 'desc' },
            select: userSelect,
        });
    }
    async findOne(clinicId, id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: userSelect,
        });
        if (!user || user.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
        return user;
    }
    async update(clinicId, id, dto) {
        const user = await this.findOne(clinicId, id);
        if (dto.branch_id) {
            const branch = await this.prisma.branch.findUnique({
                where: { id: dto.branch_id },
            });
            if (!branch || branch.clinic_id !== user.clinic_id) {
                throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
            }
        }
        return this.prisma.user.update({
            where: { id },
            data: dto,
            select: userSelect,
        });
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        password_service_js_1.PasswordService])
], UserService);
//# sourceMappingURL=user.service.js.map