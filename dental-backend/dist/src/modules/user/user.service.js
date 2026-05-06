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
const s3_service_js_1 = require("../../common/services/s3.service.js");
const userSelect = {
    id: true,
    clinic_id: true,
    branch_id: true,
    branch: { select: { id: true, name: true } },
    name: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    email_verified: true,
    phone_verified: true,
    is_doctor: true,
    license_number: true,
    signature_url: true,
    profile_photo_url: true,
    created_at: true,
    updated_at: true,
};
const SIGNATURE_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const SIGNATURE_MAX_BYTES = 1 * 1024 * 1024;
const PROFILE_PHOTO_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
function slugify(input) {
    return input.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'user';
}
let UserService = class UserService {
    prisma;
    passwordService;
    s3Service;
    constructor(prisma, passwordService, s3Service) {
        this.prisma = prisma;
        this.passwordService = passwordService;
        this.s3Service = s3Service;
    }
    async withSignedUrls(record) {
        const sig = record.signature_url;
        const photo = record.profile_photo_url;
        const [signedSig, signedPhoto] = await Promise.all([
            sig ? this.s3Service.getSignedUrl(sig).catch(() => null) : Promise.resolve(null),
            photo ? this.s3Service.getSignedUrl(photo).catch(() => null) : Promise.resolve(null),
        ]);
        return {
            ...record,
            signature_url: signedSig ?? sig ?? null,
            profile_photo_url: signedPhoto ?? photo ?? null,
        };
    }
    async uploadSignature(clinicId, userId, file) {
        await this.findOne(clinicId, userId);
        if (!file?.buffer || file.size === 0) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (file.size > SIGNATURE_MAX_BYTES) {
            throw new common_1.BadRequestException('Signature must be 1 MB or smaller');
        }
        if (!SIGNATURE_ALLOWED_MIME.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Signature must be a PNG, JPEG, or WebP image');
        }
        const ext = file.mimetype === 'image/png' ? 'png'
            : file.mimetype === 'image/webp' ? 'webp'
                : 'jpg';
        const key = `clinics/${clinicId}/doctor-signatures/${userId}.${ext}`;
        await this.s3Service.upload(key, file.buffer, file.mimetype);
        await this.prisma.user.update({
            where: { id: userId },
            data: { signature_url: key },
        });
        const signed = await this.s3Service.getSignedUrl(key).catch(() => null);
        return { signature_url: signed ?? key };
    }
    async uploadProfilePhoto(clinicId, userId, file) {
        const user = await this.findOne(clinicId, userId);
        if (!file?.buffer || file.size === 0) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (file.size > PROFILE_PHOTO_MAX_BYTES) {
            throw new common_1.BadRequestException('Profile photo must be 2 MB or smaller');
        }
        if (!PROFILE_PHOTO_ALLOWED_MIME.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Profile photo must be a PNG, JPEG, or WebP image');
        }
        const ext = file.mimetype === 'image/png' ? 'png'
            : file.mimetype === 'image/webp' ? 'webp'
                : 'jpg';
        const slug = slugify(user.name);
        const key = `clinics/${clinicId}/staff-photos/${slug}_${userId}.${ext}`;
        await this.s3Service.upload(key, file.buffer, file.mimetype);
        await this.prisma.user.update({
            where: { id: userId },
            data: { profile_photo_url: key },
        });
        const signed = await this.s3Service.getSignedUrl(key).catch(() => null);
        return { profile_photo_url: signed ?? key };
    }
    async deleteProfilePhoto(clinicId, userId) {
        await this.findOne(clinicId, userId);
        await this.prisma.user.update({
            where: { id: userId },
            data: { profile_photo_url: null },
        });
        return { message: 'Profile photo removed' };
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
        const created = await this.prisma.user.create({
            data: { ...rest, clinic_id: clinicId, password_hash: await this.passwordService.hash(finalPassword) },
            select: userSelect,
        });
        return this.withSignedUrls(created);
    }
    async findByEmail(email, clinicId) {
        return this.prisma.user.findUnique({
            where: { email_clinic_id: { email, clinic_id: clinicId } },
        });
    }
    async findAll(clinicId, role, search, branchId) {
        const where = { clinic_id: clinicId };
        if (role) {
            const roles = role.split(',').map((r) => r.trim()).filter(Boolean);
            const isDoctorQuery = roles.some((r) => r.toLowerCase() === 'dentist' || r.toLowerCase() === 'consultant');
            if (isDoctorQuery) {
                where.AND = [
                    ...(where.AND ?? []),
                    { OR: [{ role: roles.length > 1 ? { in: roles } : roles[0] }, { is_doctor: true }] },
                ];
            }
            else {
                where.role = roles.length > 1 ? { in: roles } : roles[0];
            }
        }
        if (branchId)
            where.branch_id = branchId;
        if (search) {
            where.AND = [
                ...(where.AND ?? []),
                { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] },
            ];
        }
        const users = await this.prisma.user.findMany({
            where,
            orderBy: { created_at: 'desc' },
            select: userSelect,
        });
        return Promise.all(users.map((u) => this.withSignedUrls(u)));
    }
    async findOne(clinicId, id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: userSelect,
        });
        if (!user || user.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`User with ID "${id}" not found`);
        }
        return this.withSignedUrls(user);
    }
    async remove(clinicId, id) {
        await this.findOne(clinicId, id);
        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted successfully' };
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
        const updated = await this.prisma.user.update({
            where: { id },
            data: dto,
            select: userSelect,
        });
        return this.withSignedUrls(updated);
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        password_service_js_1.PasswordService,
        s3_service_js_1.S3Service])
], UserService);
//# sourceMappingURL=user.service.js.map