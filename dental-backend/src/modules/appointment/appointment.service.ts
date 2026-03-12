import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateAppointmentDto, UpdateAppointmentDto, QueryAppointmentDto } from './dto/index.js';
import { Appointment, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreateAppointmentDto): Promise<Appointment> {
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

    await this.checkTimeConflict(dto.dentist_id, dto.appointment_date, dto.start_time, dto.end_time);

    const { appointment_date, ...rest } = dto;
    return this.prisma.appointment.create({
      data: {
        ...rest,
        clinic_id: clinicId,
        appointment_date: new Date(appointment_date),
      },
      include: { patient: true, dentist: true, branch: true },
    });
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

    const { appointment_date, ...rest } = dto;
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...rest,
        ...(appointment_date !== undefined ? { appointment_date: new Date(appointment_date) } : {}),
      },
      include: { patient: true, dentist: true, branch: true },
    });
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
}
