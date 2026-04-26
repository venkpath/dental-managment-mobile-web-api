import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateAppointmentDto, UpdateAppointmentDto, QueryAppointmentDto, QueryAvailableSlotsDto, CreateRecurringAppointmentDto } from './dto/index.js';
import { Appointment, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';
import { AppointmentNotificationService } from './appointment-notification.service.js';
import { AppointmentReminderProducer } from './appointment-reminder.producer.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

// Clinic timezone — default to IST; override via CLINIC_TIMEZONE env var
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';

/** Get today's date string (YYYY-MM-DD) in the clinic timezone */
function getTodayDate(tz: string = CLINIC_TIMEZONE): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz }); // en-CA gives YYYY-MM-DD
}

/** Get current time-of-day in minutes in the clinic timezone */
function getNowMinutes(tz: string = CLINIC_TIMEZONE): number {
  const parts = new Date().toLocaleTimeString('en-GB', { timeZone: tz, hour12: false }).split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/** ISO day-of-week (1=Mon..7=Sun) from a YYYY-MM-DD string, parsed at noon UTC to avoid date-shift */
function getIsoDay(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dow = d.getUTCDay(); // 0=Sun
  return dow === 0 ? 7 : dow;
}

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: AppointmentNotificationService,
    private readonly reminderProducer: AppointmentReminderProducer,
    private readonly planLimit: PlanLimitService,
  ) {}

  async create(clinicId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException('start_time must be before end_time');
    }

    await this.planLimit.enforceMonthlyCap(clinicId, 'appointments');

    const [branch, patient, dentist] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
      this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
      this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
    ]);

    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
    }
    if (!dentist || dentist.clinic_id !== clinicId) {
      throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
    }

    // Validate against branch working hours
    const workStart = branch.working_start_time ?? '09:00';
    const workEnd = branch.working_end_time ?? '18:00';
    if (dto.start_time < workStart || dto.end_time > workEnd) {
      throw new BadRequestException(`Appointment must be within branch working hours (${workStart}–${workEnd})`);
    }

    // Validate against lunch break
    if (branch.lunch_start_time && branch.lunch_end_time) {
      if (dto.start_time < branch.lunch_end_time && dto.end_time > branch.lunch_start_time) {
        throw new BadRequestException(`Appointment overlaps with lunch break (${branch.lunch_start_time}–${branch.lunch_end_time})`);
      }
    }

    // Validate advance booking days and reject past dates
    const maxDays = branch.advance_booking_days ?? 30;
    const todayStr = getTodayDate();
    const apptDateNoon = new Date(dto.appointment_date + 'T12:00:00Z');
    const todayNoon = new Date(todayStr + 'T12:00:00Z');
    const diffDays = Math.round((apptDateNoon.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      throw new BadRequestException('Cannot create appointments in the past');
    }
    if (diffDays > maxDays) {
      throw new BadRequestException(`Appointments can only be booked up to ${maxDays} days in advance`);
    }

    // Validate working day
    if (branch.working_days) {
      const isoDay = getIsoDay(dto.appointment_date);
      const workingDays = branch.working_days.split(',').map(Number);
      if (!workingDays.includes(isoDay)) {
        throw new BadRequestException('The selected date is not a working day for this branch');
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

    // Send WhatsApp confirmation (fire-and-forget — don't block the response)
    this.notificationService.sendConfirmation(clinicId, appointment.id).catch((e) => {
      this.logger.warn(`Appointment confirmation notification failed: ${(e as Error).message}`);
    });

    // Schedule BullMQ reminder jobs at exact times.
    // Awaiting here makes internal booking behavior deterministic in normal flow.
    await this.tryScheduleReminders(clinicId, appointment.id, appointment.appointment_date, appointment.start_time);

    return appointment;
  }

  async getAvailableSlots(clinicId: string, query: QueryAvailableSlotsDto): Promise<AvailableSlot[]> {
    const branch = await this.prisma.branch.findUnique({ where: { id: query.branch_id } });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${query.branch_id}" not found in this clinic`);
    }

    const dentist = await this.prisma.user.findUnique({ where: { id: query.dentist_id } });
    if (!dentist || dentist.clinic_id !== clinicId) {
      throw new NotFoundException(`Dentist with ID "${query.dentist_id}" not found in this clinic`);
    }

    // Return empty if requested date is not a working day
    if (branch.working_days) {
      const isoDay = getIsoDay(query.date);
      const workingDays = branch.working_days.split(',').map(Number);
      if (!workingDays.includes(isoDay)) {
        return [];
      }
    }

    // Read configurable settings with sensible defaults
    const workStart = branch.working_start_time ?? '09:00';
    const workEnd = branch.working_end_time ?? '18:00';
    const lunchStart = branch.lunch_start_time ?? null;
    const lunchEnd = branch.lunch_end_time ?? null;
    const slotDuration = branch.slot_duration ?? 15;
    const apptDuration = branch.default_appt_duration ?? 30;
    const bufferMinutes = branch.buffer_minutes ?? 0;

    // Generate all possible slots within working hours
    const allSlots: AvailableSlot[] = [];
    let currentMinutes = this.timeToMinutes(workStart);
    const endMinutes = this.timeToMinutes(workEnd);

    while (currentMinutes + apptDuration <= endMinutes) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + apptDuration);

      // Skip slots that overlap with lunch break
      const overlapsLunch =
        lunchStart && lunchEnd &&
        slotStart < lunchEnd && slotEnd > lunchStart;

      if (!overlapsLunch) {
        allSlots.push({ start_time: slotStart, end_time: slotEnd, available: true });
      }

      currentMinutes += slotDuration;
    }

    // Fetch existing booked appointments for this dentist on this date
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        dentist_id: query.dentist_id,
        appointment_date: new Date(query.date),
        status: { not: 'cancelled' },
      },
      select: { start_time: true, end_time: true, patient: { select: { first_name: true, last_name: true } } },
    });

    // Mark slots as unavailable if they conflict with existing appointments (including buffer)
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

    // If date is today, filter out past slots
    const today = getTodayDate();
    if (query.date === today) {
      const nowMinutes = getNowMinutes();
      const nowTime = this.minutesToTime(nowMinutes);
      return allSlots.filter((slot) => slot.start_time > nowTime);
    }

    return allSlots;
  }

  async findAll(clinicId: string, query: QueryAppointmentDto): Promise<PaginatedResult<Appointment>> {
    const where: Prisma.AppointmentWhereInput = { clinic_id: clinicId };

    if (query.date) {
      where.appointment_date = new Date(query.date);
    } else if (query.start_date && query.end_date) {
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

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, dentist: true, branch: true },
    });
    if (!appointment || appointment.clinic_id !== clinicId) {
      throw new NotFoundException(`Appointment with ID "${id}" not found`);
    }
    return appointment;
  }

  async update(clinicId: string, id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    const existing = await this.findOne(clinicId, id);

    if (dto.dentist_id) {
      const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
      if (!dentist || dentist.clinic_id !== clinicId) {
        throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
      }
    }

    const newDentistId = dto.dentist_id ?? existing.dentist_id;
    const newDate = dto.appointment_date ?? (existing.appointment_date as Date).toISOString().split('T')[0];
    const newStart = dto.start_time ?? existing.start_time;
    const newEnd = dto.end_time ?? existing.end_time;

    if (newStart >= newEnd) {
      throw new BadRequestException('start_time must be before end_time');
    }

    if (dto.dentist_id || dto.appointment_date || dto.start_time || dto.end_time) {
      await this.checkTimeConflict(newDentistId, newDate, newStart, newEnd, id);
    }

    // Validate against branch scheduling settings when rescheduling
    if (dto.appointment_date || dto.start_time || dto.end_time) {
      const branch = await this.prisma.branch.findUnique({ where: { id: existing.branch_id } });
      if (branch) {
        const workStart = branch.working_start_time ?? '09:00';
        const workEnd = branch.working_end_time ?? '18:00';
        if (newStart < workStart || newEnd > workEnd) {
          throw new BadRequestException(`Appointment must be within branch working hours (${workStart}-${workEnd})`);
        }
        if (branch.lunch_start_time && branch.lunch_end_time) {
          if (newStart < branch.lunch_end_time && newEnd > branch.lunch_start_time) {
            throw new BadRequestException(`Appointment overlaps with lunch break (${branch.lunch_start_time}-${branch.lunch_end_time})`);
          }
        }
        if (dto.appointment_date && branch.working_days) {
          const isoDay = getIsoDay(newDate);
          const workingDays = branch.working_days.split(',').map(Number);
          if (!workingDays.includes(isoDay)) {
            throw new BadRequestException('The selected date is not a working day for this branch');
          }
        }
      }
    }

    // Track old date/time for reschedule notification
    const oldDate = (existing.appointment_date as Date).toLocaleDateString('en-IN', {
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

    // Send WhatsApp notifications (fire-and-forget)
    if (isCancelled) {
      this.notificationService.sendCancellation(clinicId, id).catch((e) => {
        this.logger.warn(`Cancellation notification failed: ${(e as Error).message}`);
      });
      // Cancel queued reminder jobs so patient doesn't get reminded about cancelled appointment
      this.reminderProducer.cancelReminders(id).catch((e) => {
        this.logger.warn(`Failed to cancel reminders for appointment ${id}: ${(e as Error).message}`);
      });
    } else if (isRescheduled) {
      this.notificationService.sendReschedule(clinicId, id, oldDate, oldTime).catch((e) => {
        this.logger.warn(`Reschedule notification failed: ${(e as Error).message}`);
      });
      // Cancel old reminder jobs and schedule new ones for the updated time
      this.reminderProducer
        .rescheduleReminders(id, clinicId, updated.appointment_date, updated.start_time)
        .catch((e) => {
          this.logger.warn(`Failed to reschedule reminders for appointment ${id}: ${(e as Error).message}`);
        });
    }

    return updated;
  }

  async createRecurring(clinicId: string, dto: CreateRecurringAppointmentDto): Promise<Appointment[]> {
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException('start_time must be before end_time');
    }

    const [branch, patient, dentist] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
      this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
      this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
    ]);

    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
    }
    if (!dentist || dentist.clinic_id !== clinicId) {
      throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
    }

    // Generate dates based on interval
    const dates: string[] = [];
    const start = new Date(dto.start_date + 'T12:00:00Z');
    for (let i = 0; i < dto.occurrences; i++) {
      const d = new Date(start);
      if (dto.interval === 'weekly') d.setDate(d.getDate() + i * 7);
      else if (dto.interval === 'biweekly') d.setDate(d.getDate() + i * 14);
      else if (dto.interval === 'monthly') d.setMonth(d.getMonth() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Validate each date
    const workStart = branch.working_start_time ?? '09:00';
    const workEnd = branch.working_end_time ?? '18:00';
    if (dto.start_time < workStart || dto.end_time > workEnd) {
      throw new BadRequestException(`Appointment must be within branch working hours (${workStart}–${workEnd})`);
    }

    const skipped: string[] = [];
    const validDates: string[] = [];

    for (const dateStr of dates) {
      // Skip non-working days
      if (branch.working_days) {
        const isoDay = getIsoDay(dateStr);
        const workingDays = branch.working_days.split(',').map(Number);
        if (!workingDays.includes(isoDay)) {
          skipped.push(dateStr);
          continue;
        }
      }

      // Check for conflicts (skip conflicting dates instead of failing)
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
      throw new BadRequestException('No valid dates available for the recurring series — all dates conflict or fall on non-working days');
    }

    // Enforce monthly appointment cap for the whole recurring batch
    await this.planLimit.enforceMonthlyCap(clinicId, 'appointments', validDates.length);

    // Create all appointments in a transaction with shared recurrence_group_id
    const recurrenceGroupId = crypto.randomUUID();

    const appointments = await this.prisma.$transaction(
      validDates.map((dateStr) =>
        this.prisma.appointment.create({
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
        }),
      ),
    );

    // Schedule reminders for every appointment in the recurring series.
    // Use allSettled so one scheduling failure doesn't block the full series creation.
    const reminderResults = await Promise.allSettled(
      appointments.map((appt) =>
        this.reminderProducer.scheduleReminders(appt.id, clinicId, appt.appointment_date, appt.start_time),
      ),
    );

    reminderResults.forEach((r, idx) => {
      if (r.status === 'rejected') {
        const appt = appointments[idx];
        this.logger.warn(
          `Failed to schedule reminders for recurring appointment ${appt.id}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
        );
      }
    });

    return appointments;
  }

  async remove(clinicId: string, id: string): Promise<Appointment> {
    await this.findOne(clinicId, id);
    return this.prisma.appointment.delete({ where: { id } });
  }

  private async checkTimeConflict(
    dentistId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const where: Prisma.AppointmentWhereInput = {
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
      throw new ConflictException(
        `Dentist already has an appointment on ${date} from ${conflict.start_time} to ${conflict.end_time}`,
      );
    }
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private async tryScheduleReminders(
    clinicId: string,
    appointmentId: string,
    appointmentDate: Date,
    startTime: string,
  ): Promise<void> {
    try {
      await this.reminderProducer.scheduleReminders(appointmentId, clinicId, appointmentDate, startTime);
    } catch (e) {
      this.logger.warn(
        `Failed to schedule reminders for appointment ${appointmentId}: ${(e as Error).message}`,
      );
    }
  }
}
