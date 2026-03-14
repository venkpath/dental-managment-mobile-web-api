import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { CreateClinicEventDto, UpdateClinicEventDto } from './dto/index.js';

/** Pre-seeded Indian festivals (system-level, clinic_id = null) */
const SYSTEM_FESTIVALS = [
  { event_name: 'New Year', month: 1, day: 1 },
  { event_name: 'Makar Sankranti / Pongal', month: 1, day: 14 },
  { event_name: 'Republic Day', month: 1, day: 26 },
  { event_name: 'Valentine\'s Day', month: 2, day: 14 },
  { event_name: 'Holi', month: 3, day: 14 }, // approximate, varies yearly
  { event_name: 'Women\'s Day', month: 3, day: 8 },
  { event_name: 'Ugadi / Gudi Padwa', month: 3, day: 30 },
  { event_name: 'Ram Navami', month: 4, day: 6 },
  { event_name: 'Easter', month: 4, day: 20 },
  { event_name: 'World Health Day', month: 4, day: 7 },
  { event_name: 'Mother\'s Day', month: 5, day: 11 },
  { event_name: 'Eid ul-Fitr', month: 3, day: 31 }, // varies
  { event_name: 'Father\'s Day', month: 6, day: 15 },
  { event_name: 'Independence Day', month: 8, day: 15 },
  { event_name: 'Raksha Bandhan', month: 8, day: 9 },
  { event_name: 'Janmashtami', month: 8, day: 16 },
  { event_name: 'Ganesh Chaturthi', month: 8, day: 27 },
  { event_name: 'Onam', month: 9, day: 5 },
  { event_name: 'Teacher\'s Day', month: 9, day: 5 },
  { event_name: 'Navratri', month: 10, day: 2 },
  { event_name: 'Dussehra / Vijayadashami', month: 10, day: 12 },
  { event_name: 'Diwali', month: 10, day: 20 },
  { event_name: 'Children\'s Day', month: 11, day: 14 },
  { event_name: 'Christmas', month: 12, day: 25 },
  { event_name: 'World Dentist Day', month: 3, day: 6 },
  { event_name: 'World Oral Health Day', month: 3, day: 20 },
];

@Injectable()
export class ClinicEventsService {
  private readonly logger = new Logger(ClinicEventsService.name);
  private seeded = false;

  constructor(private readonly prisma: PrismaService) {}

  /** Seed default Indian festivals as system events (clinic_id = null) */
  async seedSystemEvents(): Promise<void> {
    if (this.seeded) return;

    const currentYear = new Date().getFullYear();
    const existingCount = await this.prisma.clinicEvent.count({
      where: { clinic_id: null },
    });

    if (existingCount > 0) {
      this.seeded = true;
      return;
    }

    this.logger.log('Seeding system festival events...');

    const data = SYSTEM_FESTIVALS.map((f) => ({
      clinic_id: null as string | null,
      event_name: f.event_name,
      event_date: new Date(currentYear, f.month - 1, f.day),
      is_recurring: true,
      is_enabled: true,
      send_offer: false,
    }));

    await this.prisma.clinicEvent.createMany({ data });
    this.seeded = true;
    this.logger.log(`Seeded ${data.length} system festival events.`);
  }

  /** Get all events (system + clinic-specific) */
  async findAll(clinicId: string) {
    await this.seedSystemEvents();

    return this.prisma.clinicEvent.findMany({
      where: {
        OR: [
          // System events
          { clinic_id: null },
          // Clinic-specific events
          { clinic_id: clinicId },
        ],
      },
      include: {
        template: { select: { id: true, template_name: true, channel: true } },
      },
      orderBy: { event_date: 'asc' },
    });
  }

  /** Create a clinic-specific event */
  async create(clinicId: string, dto: CreateClinicEventDto) {
    return this.prisma.clinicEvent.create({
      data: {
        clinic_id: clinicId,
        event_name: dto.event_name,
        event_date: new Date(dto.event_date),
        is_recurring: dto.is_recurring ?? true,
        template_id: dto.template_id,
        send_offer: dto.send_offer ?? false,
        offer_details: dto.offer_details as never,
      },
    });
  }

  /** Update a clinic event (or override a system event for this clinic) */
  async update(clinicId: string, eventId: string, dto: UpdateClinicEventDto) {
    const event = await this.prisma.clinicEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    // If it's a system event, clone it for this clinic with overrides
    if (!event.clinic_id) {
      return this.prisma.clinicEvent.create({
        data: {
          clinic_id: clinicId,
          event_name: dto.event_name ?? event.event_name,
          event_date: dto.event_date ? new Date(dto.event_date) : event.event_date,
          is_recurring: dto.is_recurring ?? event.is_recurring,
          is_enabled: dto.is_enabled ?? event.is_enabled,
          template_id: dto.template_id ?? event.template_id,
          send_offer: dto.send_offer ?? event.send_offer,
          offer_details: dto.offer_details as never ?? event.offer_details,
        },
      });
    }

    // Verify clinic ownership
    if (event.clinic_id !== clinicId) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.clinicEvent.update({
      where: { id: eventId },
      data: {
        event_name: dto.event_name,
        event_date: dto.event_date ? new Date(dto.event_date) : undefined,
        is_recurring: dto.is_recurring,
        is_enabled: dto.is_enabled,
        template_id: dto.template_id,
        send_offer: dto.send_offer,
        offer_details: dto.offer_details as never,
      },
    });
  }

  /** Delete a clinic-specific event (system events can only be disabled) */
  async remove(clinicId: string, eventId: string) {
    const event = await this.prisma.clinicEvent.findFirst({
      where: { id: eventId, clinic_id: clinicId },
    });
    if (!event) throw new NotFoundException('Clinic event not found');

    return this.prisma.clinicEvent.delete({ where: { id: eventId } });
  }

  /** Get upcoming events in the next N days */
  async getUpcoming(clinicId: string, days = 30) {
    await this.seedSystemEvents();

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future = new Date(now);
    future.setDate(future.getDate() + days);

    return this.prisma.clinicEvent.findMany({
      where: {
        is_enabled: true,
        event_date: { gte: now, lte: future },
        OR: [{ clinic_id: null }, { clinic_id: clinicId }],
      },
      orderBy: { event_date: 'asc' },
    });
  }
}
