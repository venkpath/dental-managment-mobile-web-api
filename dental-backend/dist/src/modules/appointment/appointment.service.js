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
var AppointmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const appointment_notification_service_js_1 = require("./appointment-notification.service.js");
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';
function getTodayDate(tz = CLINIC_TIMEZONE) {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}
function getNowMinutes(tz = CLINIC_TIMEZONE) {
    const parts = new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour12: false }).split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}
function getIsoDay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    const dow = d.getUTCDay();
    return dow === 0 ? 7 : dow;
}
let AppointmentService = AppointmentService_1 = class AppointmentService {
    prisma;
    notificationService;
    logger = new common_1.Logger(AppointmentService_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async create(clinicId, dto) {
        if (dto.start_time >= dto.end_time) {
            throw new common_1.BadRequestException('start_time must be before end_time');
        }
        const [branch, patient, dentist] = await Promise.all([
            this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
            this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
            this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
        ]);
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
        }
        if (!dentist || dentist.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
        }
        const workStart = branch.working_start_time ?? '09:00';
        const workEnd = branch.working_end_time ?? '18:00';
        if (dto.start_time < workStart || dto.end_time > workEnd) {
            throw new common_1.BadRequestException(`Appointment must be within branch working hours (${workStart}–${workEnd})`);
        }
        if (branch.lunch_start_time && branch.lunch_end_time) {
            if (dto.start_time < branch.lunch_end_time && dto.end_time > branch.lunch_start_time) {
                throw new common_1.BadRequestException(`Appointment overlaps with lunch break (${branch.lunch_start_time}–${branch.lunch_end_time})`);
            }
        }
        const maxDays = branch.advance_booking_days ?? 30;
        const todayStr = getTodayDate();
        const apptDateNoon = new Date(dto.appointment_date + 'T12:00:00Z');
        const todayNoon = new Date(todayStr + 'T12:00:00Z');
        const diffDays = Math.round((apptDateNoon.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            throw new common_1.BadRequestException('Cannot create appointments in the past');
        }
        if (diffDays > maxDays) {
            throw new common_1.BadRequestException(`Appointments can only be booked up to ${maxDays} days in advance`);
        }
        if (branch.working_days) {
            const isoDay = getIsoDay(dto.appointment_date);
            const workingDays = branch.working_days.split(',').map(Number);
            if (!workingDays.includes(isoDay)) {
                throw new common_1.BadRequestException('The selected date is not a working day for this branch');
            }
        }
        await this.checkTimeConflict(dto.dentist_id, dto.appointment_date, dto.start_time, dto.end_time);
        const { appointment_date, ...rest } = dto;
        const appointment = await this.prisma.appointment.create({
            data: {
                ...rest,
                clinic_id: clinicId,
                appointment_date: new Date(appointment_date),
            },
            include: { patient: true, dentist: true, branch: true },
        });
        this.notificationService.sendConfirmation(clinicId, appointment.id).catch((e) => {
            this.logger.warn(`Appointment confirmation notification failed: ${e.message}`);
        });
        return appointment;
    }
    async getAvailableSlots(clinicId, query) {
        const branch = await this.prisma.branch.findUnique({ where: { id: query.branch_id } });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${query.branch_id}" not found in this clinic`);
        }
        const dentist = await this.prisma.user.findUnique({ where: { id: query.dentist_id } });
        if (!dentist || dentist.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Dentist with ID "${query.dentist_id}" not found in this clinic`);
        }
        if (branch.working_days) {
            const isoDay = getIsoDay(query.date);
            const workingDays = branch.working_days.split(',').map(Number);
            if (!workingDays.includes(isoDay)) {
                return [];
            }
        }
        const workStart = branch.working_start_time ?? '09:00';
        const workEnd = branch.working_end_time ?? '18:00';
        const lunchStart = branch.lunch_start_time ?? null;
        const lunchEnd = branch.lunch_end_time ?? null;
        const slotDuration = branch.slot_duration ?? 15;
        const apptDuration = branch.default_appt_duration ?? 30;
        const bufferMinutes = branch.buffer_minutes ?? 0;
        const allSlots = [];
        let currentMinutes = this.timeToMinutes(workStart);
        const endMinutes = this.timeToMinutes(workEnd);
        while (currentMinutes + apptDuration <= endMinutes) {
            const slotStart = this.minutesToTime(currentMinutes);
            const slotEnd = this.minutesToTime(currentMinutes + apptDuration);
            const overlapsLunch = lunchStart && lunchEnd &&
                slotStart < lunchEnd && slotEnd > lunchStart;
            if (!overlapsLunch) {
                allSlots.push({ start_time: slotStart, end_time: slotEnd, available: true });
            }
            currentMinutes += slotDuration;
        }
        const existingAppointments = await this.prisma.appointment.findMany({
            where: {
                dentist_id: query.dentist_id,
                appointment_date: new Date(query.date),
                status: { not: 'cancelled' },
            },
            select: { start_time: true, end_time: true, patient: { select: { first_name: true, last_name: true } } },
        });
        for (const slot of allSlots) {
            for (const appt of existingAppointments) {
                const apptStartWithBuffer = this.minutesToTime(Math.max(0, this.timeToMinutes(appt.start_time) - bufferMinutes));
                const apptEndWithBuffer = this.minutesToTime(this.timeToMinutes(appt.end_time) + bufferMinutes);
                if (slot.start_time < apptEndWithBuffer && slot.end_time > apptStartWithBuffer) {
                    slot.available = false;
                    break;
                }
            }
        }
        const today = getTodayDate();
        if (query.date === today) {
            const nowMinutes = getNowMinutes();
            const nowTime = this.minutesToTime(nowMinutes);
            return allSlots.filter((slot) => slot.start_time > nowTime);
        }
        return allSlots;
    }
    async findAll(clinicId, query) {
        const where = { clinic_id: clinicId };
        if (query.date) {
            where.appointment_date = new Date(query.date);
        }
        else if (query.start_date && query.end_date) {
            where.appointment_date = {
                gte: new Date(query.start_date),
                lte: new Date(query.end_date),
            };
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.dentist_id) {
            where.dentist_id = query.dentist_id;
        }
        if (query.branch_id) {
            where.branch_id = query.branch_id;
        }
        if (query.patient_id) {
            where.patient_id = query.patient_id;
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                orderBy: [{ appointment_date: 'asc' }, { start_time: 'asc' }],
                include: { patient: true, dentist: true, branch: true },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.appointment.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOne(clinicId, id) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: { patient: true, dentist: true, branch: true },
        });
        if (!appointment || appointment.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Appointment with ID "${id}" not found`);
        }
        return appointment;
    }
    async update(clinicId, id, dto) {
        const existing = await this.findOne(clinicId, id);
        if (dto.dentist_id) {
            const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
            if (!dentist || dentist.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
            }
        }
        const newDentistId = dto.dentist_id ?? existing.dentist_id;
        const newDate = dto.appointment_date ?? existing.appointment_date.toISOString().split('T')[0];
        const newStart = dto.start_time ?? existing.start_time;
        const newEnd = dto.end_time ?? existing.end_time;
        if (newStart >= newEnd) {
            throw new common_1.BadRequestException('start_time must be before end_time');
        }
        if (dto.dentist_id || dto.appointment_date || dto.start_time || dto.end_time) {
            await this.checkTimeConflict(newDentistId, newDate, newStart, newEnd, id);
        }
        if (dto.appointment_date || dto.start_time || dto.end_time) {
            const branch = await this.prisma.branch.findUnique({ where: { id: existing.branch_id } });
            if (branch) {
                const workStart = branch.working_start_time ?? '09:00';
                const workEnd = branch.working_end_time ?? '18:00';
                if (newStart < workStart || newEnd > workEnd) {
                    throw new common_1.BadRequestException(`Appointment must be within branch working hours (${workStart}-${workEnd})`);
                }
                if (branch.lunch_start_time && branch.lunch_end_time) {
                    if (newStart < branch.lunch_end_time && newEnd > branch.lunch_start_time) {
                        throw new common_1.BadRequestException(`Appointment overlaps with lunch break (${branch.lunch_start_time}-${branch.lunch_end_time})`);
                    }
                }
                if (dto.appointment_date && branch.working_days) {
                    const isoDay = getIsoDay(newDate);
                    const workingDays = branch.working_days.split(',').map(Number);
                    if (!workingDays.includes(isoDay)) {
                        throw new common_1.BadRequestException('The selected date is not a working day for this branch');
                    }
                }
            }
        }
        const oldDate = existing.appointment_date.toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
        });
        const oldTime = existing.start_time;
        const isRescheduled = !!(dto.appointment_date || dto.start_time || dto.end_time);
        const isCancelled = dto.status === 'cancelled' && existing.status !== 'cancelled';
        const { appointment_date, ...rest } = dto;
        const updated = await this.prisma.appointment.update({
            where: { id },
            data: {
                ...rest,
                ...(appointment_date !== undefined ? { appointment_date: new Date(appointment_date) } : {}),
            },
            include: { patient: true, dentist: true, branch: true },
        });
        if (isCancelled) {
            this.notificationService.sendCancellation(clinicId, id).catch((e) => {
                this.logger.warn(`Cancellation notification failed: ${e.message}`);
            });
        }
        else if (isRescheduled) {
            this.notificationService.sendReschedule(clinicId, id, oldDate, oldTime).catch((e) => {
                this.logger.warn(`Reschedule notification failed: ${e.message}`);
            });
        }
        return updated;
    }
    async createRecurring(clinicId, dto) {
        if (dto.start_time >= dto.end_time) {
            throw new common_1.BadRequestException('start_time must be before end_time');
        }
        const [branch, patient, dentist] = await Promise.all([
            this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
            this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
            this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
        ]);
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
        }
        if (!dentist || dentist.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
        }
        const dates = [];
        const start = new Date(dto.start_date + 'T12:00:00Z');
        for (let i = 0; i < dto.occurrences; i++) {
            const d = new Date(start);
            if (dto.interval === 'weekly')
                d.setDate(d.getDate() + i * 7);
            else if (dto.interval === 'biweekly')
                d.setDate(d.getDate() + i * 14);
            else if (dto.interval === 'monthly')
                d.setMonth(d.getMonth() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        const workStart = branch.working_start_time ?? '09:00';
        const workEnd = branch.working_end_time ?? '18:00';
        if (dto.start_time < workStart || dto.end_time > workEnd) {
            throw new common_1.BadRequestException(`Appointment must be within branch working hours (${workStart}–${workEnd})`);
        }
        const skipped = [];
        const validDates = [];
        for (const dateStr of dates) {
            if (branch.working_days) {
                const isoDay = getIsoDay(dateStr);
                const workingDays = branch.working_days.split(',').map(Number);
                if (!workingDays.includes(isoDay)) {
                    skipped.push(dateStr);
                    continue;
                }
            }
            const conflict = await this.prisma.appointment.findFirst({
                where: {
                    dentist_id: dto.dentist_id,
                    appointment_date: new Date(dateStr),
                    status: { not: 'cancelled' },
                    AND: [
                        { start_time: { lt: dto.end_time } },
                        { end_time: { gt: dto.start_time } },
                    ],
                },
            });
            if (conflict) {
                skipped.push(dateStr);
                continue;
            }
            validDates.push(dateStr);
        }
        if (validDates.length === 0) {
            throw new common_1.BadRequestException('No valid dates available for the recurring series — all dates conflict or fall on non-working days');
        }
        const recurrenceGroupId = crypto.randomUUID();
        const appointments = await this.prisma.$transaction(validDates.map((dateStr) => this.prisma.appointment.create({
            data: {
                clinic_id: clinicId,
                branch_id: dto.branch_id,
                patient_id: dto.patient_id,
                dentist_id: dto.dentist_id,
                appointment_date: new Date(dateStr),
                start_time: dto.start_time,
                end_time: dto.end_time,
                notes: dto.notes,
                recurrence_group_id: recurrenceGroupId,
            },
            include: { patient: true, dentist: true, branch: true },
        })));
        return appointments;
    }
    async remove(clinicId, id) {
        await this.findOne(clinicId, id);
        return this.prisma.appointment.delete({ where: { id } });
    }
    async checkTimeConflict(dentistId, date, startTime, endTime, excludeId) {
        const where = {
            dentist_id: dentistId,
            appointment_date: new Date(date),
            status: { not: 'cancelled' },
            AND: [
                { start_time: { lt: endTime } },
                { end_time: { gt: startTime } },
            ],
        };
        if (excludeId) {
            where.id = { not: excludeId };
        }
        const conflict = await this.prisma.appointment.findFirst({ where });
        if (conflict) {
            throw new common_1.ConflictException(`Dentist already has an appointment on ${date} from ${conflict.start_time} to ${conflict.end_time}`);
        }
    }
    timeToMinutes(time) {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    }
    minutesToTime(minutes) {
        const h = Math.floor(minutes / 60).toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    }
};
exports.AppointmentService = AppointmentService;
exports.AppointmentService = AppointmentService = AppointmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        appointment_notification_service_js_1.AppointmentNotificationService])
], AppointmentService);
//# sourceMappingURL=appointment.service.js.map