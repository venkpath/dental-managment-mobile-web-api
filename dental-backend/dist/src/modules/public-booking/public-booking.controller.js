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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PublicBookingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicBookingController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const booking_url_util_js_1 = require("../../common/utils/booking-url.util.js");
const appointment_reminder_producer_js_1 = require("../appointment/appointment-reminder.producer.js");
class BookAppointmentDto {
    first_name;
    last_name;
    phone;
    gender;
    email;
    dentist_id;
    appointment_date;
    start_time;
    end_time;
    notes;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Ravi' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "first_name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Kumar' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "last_name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '9876543210' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ enum: ['male', 'female', 'other'] }),
    (0, class_validator_1.IsEnum)(['male', 'female', 'other']),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'ravi@email.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "email", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist UUID' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "dentist_id", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '2026-04-10' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "appointment_date", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '10:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'start_time must be HH:mm' }),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "start_time", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '10:30' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'end_time must be HH:mm' }),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "end_time", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'Tooth pain in lower left area' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], BookAppointmentDto.prototype, "notes", void 0);
function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
function minutesToTime(m) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
function getTodayIST() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
function getNowMinutesIST() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return ist.getHours() * 60 + ist.getMinutes();
}
let PublicBookingController = PublicBookingController_1 = class PublicBookingController {
    prisma;
    reminderProducer;
    logger = new common_1.Logger(PublicBookingController_1.name);
    constructor(prisma, reminderProducer) {
        this.prisma = prisma;
        this.reminderProducer = reminderProducer;
    }
    async getBranchBookingInfo(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: branchId },
            select: {
                id: true, name: true, address: true, city: true, state: true,
                country: true, phone: true, latitude: true, longitude: true,
                map_url: true, book_now_url: true,
                working_start_time: true, working_end_time: true,
                lunch_start_time: true, lunch_end_time: true,
                working_days: true, slot_duration: true,
                clinic: { select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, country: true } },
            },
        });
        if (!branch || branch.clinic.id !== clinicId)
            throw new common_1.NotFoundException('Branch not found');
        return {
            clinic: branch.clinic,
            branch: {
                id: branch.id, name: branch.name, address: branch.address,
                city: branch.city, state: branch.state, country: branch.country,
                phone: branch.phone, latitude: branch.latitude, longitude: branch.longitude,
                map_url: branch.map_url,
                working_hours: {
                    start: branch.working_start_time ?? '09:00',
                    end: branch.working_end_time ?? '18:00',
                    lunch_start: branch.lunch_start_time ?? null,
                    lunch_end: branch.lunch_end_time ?? null,
                    working_days: branch.working_days ?? '1,2,3,4,5,6',
                },
                slot_duration: branch.slot_duration ?? 15,
            },
            booking_url: (0, booking_url_util_js_1.getBookingUrl)(clinicId, branchId, branch.book_now_url),
            has_custom_booking: !!branch.book_now_url,
        };
    }
    async getDentists(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { clinic_id: true } });
        if (!branch || branch.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Branch not found');
        const dentists = await this.prisma.user.findMany({
            where: {
                clinic_id: clinicId,
                status: 'active',
                AND: [
                    { OR: [{ role: { in: ['Dentist', 'Consultant'] } }, { is_doctor: true }] },
                    { OR: [{ branch_id: branchId }, { branch_id: null }] },
                ],
            },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
        return dentists;
    }
    async getAvailableSlots(clinicId, branchId, dentistId, date) {
        if (!dentistId || !date)
            throw new common_1.BadRequestException('dentist_id and date are required');
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch || branch.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Branch not found');
        if (branch.working_days) {
            const dayOfWeek = new Date(date + 'T00:00:00').getDay();
            const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
            const workingDays = branch.working_days.split(',').map(Number);
            if (!workingDays.includes(isoDay))
                return [];
        }
        const workStart = branch.working_start_time ?? '09:00';
        const workEnd = branch.working_end_time ?? '18:00';
        const lunchStart = branch.lunch_start_time ?? null;
        const lunchEnd = branch.lunch_end_time ?? null;
        const slotDuration = branch.slot_duration ?? 15;
        const apptDuration = branch.default_appt_duration ?? 30;
        const bufferMinutes = branch.buffer_minutes ?? 0;
        const slots = [];
        let cur = timeToMinutes(workStart);
        const end = timeToMinutes(workEnd);
        while (cur + apptDuration <= end) {
            const start = minutesToTime(cur);
            const slotEnd = minutesToTime(cur + apptDuration);
            const overlapsLunch = lunchStart && lunchEnd && start < lunchEnd && slotEnd > lunchStart;
            if (!overlapsLunch)
                slots.push({ start_time: start, end_time: slotEnd, available: true });
            cur += slotDuration;
        }
        const booked = await this.prisma.appointment.findMany({
            where: { dentist_id: dentistId, appointment_date: new Date(date), status: { not: 'cancelled' } },
            select: { start_time: true, end_time: true },
        });
        for (const slot of slots) {
            for (const appt of booked) {
                const aStart = minutesToTime(Math.max(0, timeToMinutes(appt.start_time) - bufferMinutes));
                const aEnd = minutesToTime(timeToMinutes(appt.end_time) + bufferMinutes);
                if (slot.start_time < aEnd && slot.end_time > aStart) {
                    slot.available = false;
                    break;
                }
            }
        }
        if (date === getTodayIST()) {
            const nowMins = getNowMinutesIST();
            return slots.filter((s) => timeToMinutes(s.start_time) > nowMins);
        }
        return slots;
    }
    async bookAppointment(clinicId, branchId, dto) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { clinic_id: true } });
        if (!branch || branch.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Branch not found');
        const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
        if (!dentist || dentist.clinic_id !== clinicId)
            throw new common_1.NotFoundException('Dentist not found');
        const conflict = await this.prisma.appointment.findFirst({
            where: {
                dentist_id: dto.dentist_id,
                appointment_date: new Date(dto.appointment_date),
                status: { not: 'cancelled' },
                start_time: { lt: dto.end_time },
                end_time: { gt: dto.start_time },
            },
        });
        if (conflict)
            throw new common_1.BadRequestException('This time slot is no longer available. Please choose another.');
        let patient = await this.prisma.patient.findFirst({
            where: { clinic_id: clinicId, phone: dto.phone },
        });
        if (!patient) {
            patient = await this.prisma.patient.create({
                data: {
                    clinic_id: clinicId,
                    branch_id: branchId,
                    first_name: dto.first_name,
                    last_name: dto.last_name,
                    phone: dto.phone,
                    email: dto.email,
                    gender: dto.gender,
                },
            });
        }
        const appointment = await this.prisma.appointment.create({
            data: {
                clinic_id: clinicId,
                branch_id: branchId,
                patient_id: patient.id,
                dentist_id: dto.dentist_id,
                appointment_date: new Date(dto.appointment_date),
                start_time: dto.start_time,
                end_time: dto.end_time,
                status: 'scheduled',
                notes: dto.notes,
            },
            select: {
                id: true,
                appointment_date: true,
                start_time: true,
                end_time: true,
                status: true,
                dentist: { select: { name: true } },
            },
        });
        this.reminderProducer
            .scheduleReminders(appointment.id, clinicId, appointment.appointment_date, appointment.start_time)
            .catch((e) => {
            this.logger.warn(`Failed to schedule reminders for public booking appointment ${appointment.id}: ${e.message}`);
        });
        return {
            success: true,
            message: 'Appointment booked successfully!',
            appointment: {
                id: appointment.id,
                date: appointment.appointment_date,
                start_time: appointment.start_time,
                end_time: appointment.end_time,
                dentist: appointment.dentist.name,
                patient: `${patient.first_name} ${patient.last_name}`,
            },
        };
    }
};
exports.PublicBookingController = PublicBookingController;
__decorate([
    (0, common_1.Get)(':clinicId/:branchId'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get public branch booking info (no auth required)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getBranchBookingInfo", null);
__decorate([
    (0, common_1.Get)(':clinicId/:branchId/dentists'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List dentists for a branch (no auth required)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getDentists", null);
__decorate([
    (0, common_1.Get)(':clinicId/:branchId/slots'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get available slots for a dentist on a date (no auth required)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('dentist_id')),
    __param(3, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getAvailableSlots", null);
__decorate([
    (0, common_1.Post)(':clinicId/:branchId/book'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Book an appointment (no auth required)' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Appointment booked successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, BookAppointmentDto]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "bookAppointment", null);
exports.PublicBookingController = PublicBookingController = PublicBookingController_1 = __decorate([
    (0, swagger_1.ApiTags)('Public Booking'),
    (0, common_1.Controller)('public/booking'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        appointment_reminder_producer_js_1.AppointmentReminderProducer])
], PublicBookingController);
//# sourceMappingURL=public-booking.controller.js.map