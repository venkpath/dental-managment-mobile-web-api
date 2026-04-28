import {
  Controller, Get, Post, Param, Body, Query,
  ParseUUIDPipe, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsDateString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';
import { getBookingUrl } from '../../common/utils/booking-url.util.js';
import { AppointmentReminderProducer } from '../appointment/appointment-reminder.producer.js';

// ─── DTOs ───

class BookAppointmentDto {
  @ApiProperty({ example: 'Ravi' })
  @IsString()
  @MaxLength(100)
  first_name!: string;

  @ApiProperty({ example: 'Kumar' })
  @IsString()
  @MaxLength(100)
  last_name!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @MaxLength(50)
  phone!: string;

  @ApiProperty({ enum: ['male', 'female', 'other'] })
  @IsEnum(['male', 'female', 'other'])
  gender!: string;

  @ApiPropertyOptional({ example: 'ravi@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Dentist UUID' })
  @IsUUID()
  dentist_id!: string;

  @ApiProperty({ example: '2026-04-10' })
  @IsDateString()
  appointment_date!: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'start_time must be HH:mm' })
  start_time!: string;

  @ApiProperty({ example: '10:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'end_time must be HH:mm' })
  end_time!: string;

  @ApiPropertyOptional({ example: 'Tooth pain in lower left area' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// ─── Helpers ───

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function getTodayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function getNowMinutesIST(): number {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.getHours() * 60 + ist.getMinutes();
}

// ─── Controller ───

@ApiTags('Public Booking')
@Controller('public/booking')
export class PublicBookingController {
  private readonly logger = new Logger(PublicBookingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderProducer: AppointmentReminderProducer,
  ) {}

  /** Branch info + clinic info for booking page */
  @Get(':clinicId/:branchId')
  @Public()
  @ApiOperation({ summary: 'Get public branch booking info (no auth required)' })
  async getBranchBookingInfo(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
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

    if (!branch || branch.clinic.id !== clinicId) throw new NotFoundException('Branch not found');

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
      booking_url: getBookingUrl(clinicId, branchId, branch.book_now_url),
      has_custom_booking: !!branch.book_now_url,
    };
  }

  /** List dentists available at this branch */
  @Get(':clinicId/:branchId/dentists')
  @Public()
  @ApiOperation({ summary: 'List dentists for a branch (no auth required)' })
  async getDentists(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { clinic_id: true } });
    if (!branch || branch.clinic_id !== clinicId) throw new NotFoundException('Branch not found');

    const dentists = await this.prisma.user.findMany({
      where: {
        clinic_id: clinicId,
        role: { in: ['Dentist', 'Consultant'] },
        status: 'active',
        OR: [{ branch_id: branchId }, { branch_id: null }],
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return dentists;
  }

  /** Available time slots for a dentist on a date */
  @Get(':clinicId/:branchId/slots')
  @Public()
  @ApiOperation({ summary: 'Get available slots for a dentist on a date (no auth required)' })
  async getAvailableSlots(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('dentist_id') dentistId: string,
    @Query('date') date: string,
  ) {
    if (!dentistId || !date) throw new BadRequestException('dentist_id and date are required');

    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.clinic_id !== clinicId) throw new NotFoundException('Branch not found');

    // Check working day
    if (branch.working_days) {
      const dayOfWeek = new Date(date + 'T00:00:00').getDay(); // 0=Sun
      const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
      const workingDays = branch.working_days.split(',').map(Number);
      if (!workingDays.includes(isoDay)) return [];
    }

    const workStart = branch.working_start_time ?? '09:00';
    const workEnd = branch.working_end_time ?? '18:00';
    const lunchStart = branch.lunch_start_time ?? null;
    const lunchEnd = branch.lunch_end_time ?? null;
    const slotDuration = branch.slot_duration ?? 15;
    const apptDuration = branch.default_appt_duration ?? 30;
    const bufferMinutes = branch.buffer_minutes ?? 0;

    // Generate slots
    const slots: { start_time: string; end_time: string; available: boolean }[] = [];
    let cur = timeToMinutes(workStart);
    const end = timeToMinutes(workEnd);

    while (cur + apptDuration <= end) {
      const start = minutesToTime(cur);
      const slotEnd = minutesToTime(cur + apptDuration);
      const overlapsLunch = lunchStart && lunchEnd && start < lunchEnd && slotEnd > lunchStart;
      if (!overlapsLunch) slots.push({ start_time: start, end_time: slotEnd, available: true });
      cur += slotDuration;
    }

    // Mark booked slots
    const booked = await this.prisma.appointment.findMany({
      where: { dentist_id: dentistId, appointment_date: new Date(date), status: { not: 'cancelled' } },
      select: { start_time: true, end_time: true },
    });

    for (const slot of slots) {
      for (const appt of booked) {
        const aStart = minutesToTime(Math.max(0, timeToMinutes(appt.start_time) - bufferMinutes));
        const aEnd = minutesToTime(timeToMinutes(appt.end_time) + bufferMinutes);
        if (slot.start_time < aEnd && slot.end_time > aStart) { slot.available = false; break; }
      }
    }

    // Filter past slots if today
    if (date === getTodayIST()) {
      const nowMins = getNowMinutesIST();
      return slots.filter((s) => timeToMinutes(s.start_time) > nowMins);
    }

    return slots;
  }

  /** Book an appointment — creates patient if not found, then creates appointment */
  @Post(':clinicId/:branchId/book')
  @Public()
  @ApiOperation({ summary: 'Book an appointment (no auth required)' })
  @ApiCreatedResponse({ description: 'Appointment booked successfully' })
  async bookAppointment(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: BookAppointmentDto,
  ) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { clinic_id: true } });
    if (!branch || branch.clinic_id !== clinicId) throw new NotFoundException('Branch not found');

    // Validate dentist belongs to this clinic
    const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
    if (!dentist || dentist.clinic_id !== clinicId) throw new NotFoundException('Dentist not found');

    // Check slot is still available
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        dentist_id: dto.dentist_id,
        appointment_date: new Date(dto.appointment_date),
        status: { not: 'cancelled' },
        start_time: { lt: dto.end_time },
        end_time: { gt: dto.start_time },
      },
    });
    if (conflict) throw new BadRequestException('This time slot is no longer available. Please choose another.');

    // Find existing patient by phone in this clinic, or create new
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

    // Create appointment
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

    // Schedule appointment reminders for public-booked appointments as well.
    this.reminderProducer
      .scheduleReminders(appointment.id, clinicId, appointment.appointment_date, appointment.start_time)
      .catch((e) => {
        this.logger.warn(
          `Failed to schedule reminders for public booking appointment ${appointment.id}: ${(e as Error).message}`,
        );
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
}
