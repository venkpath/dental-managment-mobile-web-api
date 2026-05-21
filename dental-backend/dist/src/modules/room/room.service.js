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
exports.RoomService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const ROOM_STATUS = {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    CLEANING: 'cleaning',
    MAINTENANCE: 'maintenance',
    RESERVED: 'reserved',
};
let RoomService = class RoomService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(clinicId, branchId) {
        const rooms = await this.prisma.room.findMany({
            where: {
                clinic_id: clinicId,
                ...(branchId ? { branch_id: branchId } : {}),
                is_active: true,
            },
            include: {
                appointments: {
                    where: {
                        status: { in: ['checked_in', 'in_progress', 'scheduled'] },
                        appointment_date: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            lte: new Date(new Date().setHours(23, 59, 59, 999)),
                        },
                    },
                    include: {
                        patient: { select: { id: true, first_name: true, last_name: true } },
                        dentist: { select: { id: true, name: true } },
                    },
                    orderBy: { start_time: 'asc' },
                },
                branch: { select: { id: true, name: true, room_cleaning_duration_minutes: true } },
            },
            orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
        });
        const now = new Date();
        const updates = [];
        for (const room of rooms) {
            if (room.status === ROOM_STATUS.CLEANING &&
                room.cleaning_started_at) {
                const cleaningDuration = (room.branch?.room_cleaning_duration_minutes ?? 2) * 60 * 1000;
                const elapsed = now.getTime() - room.cleaning_started_at.getTime();
                if (elapsed >= cleaningDuration) {
                    updates.push(this.prisma.room.update({
                        where: { id: room.id },
                        data: { status: ROOM_STATUS.AVAILABLE, cleaning_started_at: null },
                    }));
                    room.status = ROOM_STATUS.AVAILABLE;
                    room.cleaning_started_at = null;
                }
            }
        }
        if (updates.length > 0)
            await Promise.all(updates);
        return rooms;
    }
    async findOne(clinicId, id) {
        const room = await this.prisma.room.findUnique({
            where: { id },
            include: {
                appointments: {
                    where: {
                        status: { in: ['checked_in', 'in_progress', 'scheduled'] },
                        appointment_date: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            lte: new Date(new Date().setHours(23, 59, 59, 999)),
                        },
                    },
                    include: {
                        patient: { select: { id: true, first_name: true, last_name: true } },
                        dentist: { select: { id: true, name: true } },
                    },
                    orderBy: { start_time: 'asc' },
                },
                branch: { select: { id: true, name: true, room_cleaning_duration_minutes: true } },
            },
        });
        if (!room || room.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Room "${id}" not found`);
        }
        return room;
    }
    async create(clinicId, branchId, dto) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch "${branchId}" not found`);
        }
        return this.prisma.room.create({
            data: { ...dto, clinic_id: clinicId, branch_id: branchId },
        });
    }
    async update(clinicId, id, dto) {
        await this.findOne(clinicId, id);
        return this.prisma.room.update({ where: { id }, data: dto });
    }
    async setStatus(clinicId, id, dto) {
        const room = await this.findOne(clinicId, id);
        const data = { status: dto.status };
        if (dto.status === ROOM_STATUS.CLEANING) {
            data.cleaning_started_at = new Date();
        }
        else if (dto.status !== ROOM_STATUS.CLEANING) {
            data.cleaning_started_at = null;
        }
        if (dto.status === ROOM_STATUS.AVAILABLE || dto.status === ROOM_STATUS.CLEANING) {
            await this.prisma.appointment.updateMany({
                where: {
                    room_id: id,
                    status: { in: ['checked_in', 'in_progress'] },
                },
                data: { room_id: null },
            });
        }
        return this.prisma.room.update({ where: { id: room.id }, data });
    }
    async assignAppointment(clinicId, roomId, dto) {
        await this.findOne(clinicId, roomId);
        if (dto.appointment_id) {
            const appt = await this.prisma.appointment.findUnique({ where: { id: dto.appointment_id } });
            if (!appt || appt.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Appointment "${dto.appointment_id}" not found`);
            }
            if (!['scheduled', 'checked_in'].includes(appt.status)) {
                throw new common_1.BadRequestException('Only scheduled or checked-in appointments can be assigned to a room');
            }
            await this.prisma.appointment.updateMany({
                where: { room_id: roomId, id: { not: dto.appointment_id } },
                data: { room_id: null },
            });
            await this.prisma.appointment.update({
                where: { id: dto.appointment_id },
                data: { room_id: roomId, status: 'checked_in' },
            });
            await this.prisma.room.update({
                where: { id: roomId },
                data: { status: ROOM_STATUS.OCCUPIED, cleaning_started_at: null },
            });
        }
        else {
            await this.prisma.appointment.updateMany({
                where: { room_id: roomId },
                data: { room_id: null },
            });
            await this.prisma.room.update({
                where: { id: roomId },
                data: { status: ROOM_STATUS.AVAILABLE },
            });
        }
        return this.findOne(clinicId, roomId);
    }
    async remove(clinicId, id) {
        const room = await this.findOne(clinicId, id);
        if (room.status === ROOM_STATUS.OCCUPIED) {
            throw new common_1.BadRequestException('Cannot delete a room that is currently occupied');
        }
        return this.prisma.room.delete({ where: { id } });
    }
};
exports.RoomService = RoomService;
exports.RoomService = RoomService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], RoomService);
//# sourceMappingURL=room.service.js.map