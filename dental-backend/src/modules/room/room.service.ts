import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateRoomDto, UpdateRoomDto, UpdateRoomStatusDto, AssignRoomDto } from './dto/index.js';

const ROOM_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  CLEANING: 'cleaning',
  MAINTENANCE: 'maintenance',
  RESERVED: 'reserved',
} as const;

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string, branchId?: string) {
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

    // Auto-release rooms from cleaning if the cleaning timer has elapsed
    const now = new Date();
    const updates: Promise<unknown>[] = [];

    for (const room of rooms) {
      if (
        room.status === ROOM_STATUS.CLEANING &&
        room.cleaning_started_at
      ) {
        const cleaningDuration = (room.branch?.room_cleaning_duration_minutes ?? 2) * 60 * 1000;
        const elapsed = now.getTime() - room.cleaning_started_at.getTime();
        if (elapsed >= cleaningDuration) {
          updates.push(
            this.prisma.room.update({
              where: { id: room.id },
              data: { status: ROOM_STATUS.AVAILABLE, cleaning_started_at: null },
            }),
          );
          room.status = ROOM_STATUS.AVAILABLE;
          room.cleaning_started_at = null;
        }
      }
    }

    if (updates.length > 0) await Promise.all(updates);

    return rooms;
  }

  async findOne(clinicId: string, id: string) {
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
      throw new NotFoundException(`Room "${id}" not found`);
    }
    return room;
  }

  async create(clinicId: string, branchId: string, dto: CreateRoomDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch "${branchId}" not found`);
    }
    return this.prisma.room.create({
      data: { ...dto, clinic_id: clinicId, branch_id: branchId },
    });
  }

  async update(clinicId: string, id: string, dto: UpdateRoomDto) {
    await this.findOne(clinicId, id);
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async setStatus(clinicId: string, id: string, dto: UpdateRoomStatusDto) {
    const room = await this.findOne(clinicId, id);

    const data: Record<string, unknown> = { status: dto.status };

    if (dto.status === ROOM_STATUS.CLEANING) {
      data.cleaning_started_at = new Date();
    } else if (dto.status !== ROOM_STATUS.CLEANING) {
      data.cleaning_started_at = null;
    }

    // When marking available/cleaning, clear any linked appointment on the room
    if (dto.status === ROOM_STATUS.AVAILABLE || dto.status === ROOM_STATUS.CLEANING) {
      // Dissociate any in-progress appointment from room
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

  async assignAppointment(clinicId: string, roomId: string, dto: AssignRoomDto) {
    await this.findOne(clinicId, roomId);

    if (dto.appointment_id) {
      const appt = await this.prisma.appointment.findUnique({ where: { id: dto.appointment_id } });
      if (!appt || appt.clinic_id !== clinicId) {
        throw new NotFoundException(`Appointment "${dto.appointment_id}" not found`);
      }
      if (!['scheduled', 'checked_in'].includes(appt.status)) {
        throw new BadRequestException('Only scheduled or checked-in appointments can be assigned to a room');
      }

      // Move any existing appointment out of this room first
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
    } else {
      // Un-assign
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

  async remove(clinicId: string, id: string) {
    const room = await this.findOne(clinicId, id);
    if (room.status === ROOM_STATUS.OCCUPIED) {
      throw new BadRequestException('Cannot delete a room that is currently occupied');
    }
    return this.prisma.room.delete({ where: { id } });
  }
}
