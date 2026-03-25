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
let BranchService = class BranchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(clinicId, dto) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
        });
        if (!clinic) {
            throw new common_1.NotFoundException(`Clinic with ID "${clinicId}" not found`);
        }
        return this.prisma.branch.create({
            data: { ...dto, clinic_id: clinicId },
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
};
exports.BranchService = BranchService;
exports.BranchService = BranchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], BranchService);
//# sourceMappingURL=branch.service.js.map