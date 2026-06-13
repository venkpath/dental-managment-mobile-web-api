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
exports.BranchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const booking_url_util_js_1 = require("../../common/utils/booking-url.util.js");
const PHOTO_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
let BranchService = class BranchService {
    prisma;
    s3;
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
    }
    async create(clinicId, dto) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                id: true,
                custom_max_branches: true,
                plan: { select: { max_branches: true } },
            },
        });
        if (!clinic) {
            throw new common_1.NotFoundException(`Clinic with ID "${clinicId}" not found`);
        }
        const limit = clinic.custom_max_branches ?? clinic.plan?.max_branches ?? null;
        if (limit !== null) {
            const current = await this.prisma.branch.count({ where: { clinic_id: clinicId } });
            if (current >= limit) {
                throw new common_1.ForbiddenException(`Branch limit reached: your plan allows ${limit} branch${limit === 1 ? '' : 'es'}. Contact support to add more.`);
            }
        }
        return this.prisma.branch.create({
            data: { ...dto, clinic_id: clinicId, booking_short_code: (0, booking_url_util_js_1.generateBookingShortCode)() },
        });
    }
    async findAll(clinicId) {
        return this.prisma.branch.findMany({
            where: { clinic_id: clinicId },
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(clinicId, id) {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
        });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${id}" not found`);
        }
        return branch;
    }
    async update(clinicId, id, dto) {
        await this.findOne(clinicId, id);
        return this.prisma.branch.update({
            where: { id },
            data: dto,
        });
    }
    async updateSchedulingSettings(clinicId, id, dto) {
        const branch = await this.findOne(clinicId, id);
        const effectiveStart = dto.working_start_time ?? branch.working_start_time ?? '09:00';
        const effectiveEnd = dto.working_end_time ?? branch.working_end_time ?? '18:00';
        if (effectiveStart >= effectiveEnd) {
            throw new common_1.BadRequestException('working_start_time must be before working_end_time');
        }
        const effectiveLunchStart = dto.lunch_start_time ?? branch.lunch_start_time;
        const effectiveLunchEnd = dto.lunch_end_time ?? branch.lunch_end_time;
        if (effectiveLunchStart && effectiveLunchEnd && effectiveLunchStart >= effectiveLunchEnd) {
            throw new common_1.BadRequestException('lunch_start_time must be before lunch_end_time');
        }
        return this.prisma.branch.update({
            where: { id },
            data: dto,
        });
    }
    async getSchedulingSettings(clinicId, id) {
        const branch = await this.findOne(clinicId, id);
        return {
            working_start_time: branch.working_start_time ?? '09:00',
            working_end_time: branch.working_end_time ?? '18:00',
            lunch_start_time: branch.lunch_start_time ?? null,
            lunch_end_time: branch.lunch_end_time ?? null,
            slot_duration: branch.slot_duration ?? 15,
            default_appt_duration: branch.default_appt_duration ?? 30,
            buffer_minutes: branch.buffer_minutes ?? 0,
            advance_booking_days: branch.advance_booking_days ?? 30,
            working_days: branch.working_days ?? '1,2,3,4,5,6',
        };
    }
    async uploadPhoto(clinicId, branchId, file) {
        const branch = await this.findOne(clinicId, branchId);
        if (!file?.buffer || file.size === 0)
            throw new common_1.BadRequestException('No file uploaded');
        if (file.size > PHOTO_MAX_BYTES)
            throw new common_1.BadRequestException('Photo must be 5 MB or smaller');
        if (!PHOTO_ALLOWED_MIME.includes(file.mimetype))
            throw new common_1.BadRequestException('Photo must be PNG, JPEG, or WebP');
        if (branch.photo_url) {
            await this.s3.delete(branch.photo_url).catch(() => null);
        }
        const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
        const key = `clinics/${branch.clinic_id}/branch-photos/${branchId}.${ext}`;
        await this.s3.upload(key, file.buffer, file.mimetype);
        await this.prisma.branch.update({ where: { id: branchId }, data: { photo_url: key } });
        const signed = await this.s3.getSignedUrl(key).catch(() => null);
        return { photo_url: signed ?? key };
    }
    async deletePhoto(clinicId, branchId) {
        const branch = await this.findOne(clinicId, branchId);
        if (branch.photo_url) {
            await this.s3.delete(branch.photo_url).catch(() => null);
        }
        await this.prisma.branch.update({ where: { id: branchId }, data: { photo_url: null } });
        return { message: 'Photo removed' };
    }
};
exports.BranchService = BranchService;
exports.BranchService = BranchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        s3_service_js_1.S3Service])
], BranchService);
//# sourceMappingURL=branch.service.js.map