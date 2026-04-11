import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { CreateClinicEventDto, UpdateClinicEventDto } from './dto/index.js';

// ─── Festival Date Algorithms ───────────────────────────────────────────────

/** Easter Sunday date using the Anonymous Gregorian algorithm. */
function calculateEaster(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** Nth occurrence of a weekday (0=Sun…6=Sat) in a given month/year. Returns the day of month. */
function getNthWeekday(year: number, month: number, weekday: number, n: number): number {
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const firstOccurrence = 1 + ((weekday - firstDayOfMonth + 7) % 7);
  return firstOccurrence + (n - 1) * 7;
}

// ─── Lunar / Variable Festival Lookup Table (2025–2035) ─────────────────────
//
// Fixed festivals (Christmas, Independence Day, etc.) are handled by SYSTEM_FESTIVALS.
// Hindu and Islamic dates shift each year — pre-computed here for 2025–2035.
// Easter, Mother's Day, Father's Day are calculated algorithmically (no lookup needed).
// Sources: Indian government calendars + Drik Panchang.

type LunarCalendar = Record<string, [number, number]>; // event_name → [month, day]

const LUNAR_FESTIVAL_CALENDAR: Record<number, LunarCalendar> = {
  2025: {
    'Eid ul-Fitr':        [3,  31],
    'Holi':               [3,  14],
    'Ugadi / Gudi Padwa': [3,  30],
    'Ram Navami':         [4,   6],
    'Raksha Bandhan':     [8,   9],
    'Janmashtami':        [8,  16],
    'Ganesh Chaturthi':   [8,  27],
    'Onam':               [9,   5],
    'Navratri':           [10,  2],
    'Dussehra':           [10, 12],
    'Diwali':             [10, 20],
    'Pongal':             [1,  14],
  },
  2026: {
    'Eid ul-Fitr':        [3,  20],
    'Holi':               [3,  21],
    'Ugadi / Gudi Padwa': [3,  19],
    'Ram Navami':         [3,  28],
    'Raksha Bandhan':     [8,  23],
    'Janmashtami':        [8,  15],
    'Ganesh Chaturthi':   [8,  20],
    'Onam':               [9,   1],
    'Navratri':           [10, 13],
    'Dussehra':           [10, 22],
    'Diwali':             [10, 28],
    'Pongal':             [1,  14],
  },
  2027: {
    'Eid ul-Fitr':        [3,  10],
    'Holi':               [3,  10],
    'Ugadi / Gudi Padwa': [3,  18],
    'Ram Navami':         [4,  16],
    'Raksha Bandhan':     [8,  13],
    'Janmashtami':        [8,   4],
    'Ganesh Chaturthi':   [8,   8],
    'Onam':               [8,  25],
    'Navratri':           [10,  1],
    'Dussehra':           [10, 11],
    'Diwali':             [10, 18],
    'Pongal':             [1,  14],
  },
  2028: {
    'Eid ul-Fitr':        [2,  27],
    'Holi':               [3,  28],
    'Ugadi / Gudi Padwa': [4,   5],
    'Ram Navami':         [4,   4],
    'Raksha Bandhan':     [8,   1],
    'Janmashtami':        [8,  22],
    'Ganesh Chaturthi':   [8,  26],
    'Onam':               [9,  11],
    'Navratri':           [10, 19],
    'Dussehra':           [10, 29],
    'Diwali':             [11,  5],
    'Pongal':             [1,  15],
  },
  2029: {
    'Eid ul-Fitr':        [2,  16],
    'Holi':               [3,  17],
    'Ugadi / Gudi Padwa': [3,  25],
    'Ram Navami':         [3,  24],
    'Raksha Bandhan':     [8,  19],
    'Janmashtami':        [8,   9],
    'Ganesh Chaturthi':   [8,  14],
    'Onam':               [8,  31],
    'Navratri':           [10,  8],
    'Dussehra':           [10, 17],
    'Diwali':             [10, 26],
    'Pongal':             [1,  14],
  },
  2030: {
    'Eid ul-Fitr':        [2,   5],
    'Holi':               [3,   6],
    'Ugadi / Gudi Padwa': [4,  13],
    'Ram Navami':         [4,  12],
    'Raksha Bandhan':     [8,   9],
    'Janmashtami':        [8,  28],
    'Ganesh Chaturthi':   [9,   2],
    'Onam':               [9,  18],
    'Navratri':           [10, 27],
    'Dussehra':           [11,  5],
    'Diwali':             [11, 14],
    'Pongal':             [1,  14],
  },
  2031: {
    'Eid ul-Fitr':        [1,  25],
    'Holi':               [3,  25],
    'Ugadi / Gudi Padwa': [4,   2],
    'Ram Navami':         [4,   1],
    'Raksha Bandhan':     [7,  30],
    'Janmashtami':        [8,  17],
    'Ganesh Chaturthi':   [8,  22],
    'Onam':               [9,   7],
    'Navratri':           [10, 16],
    'Dussehra':           [10, 25],
    'Diwali':             [11,  2],
    'Pongal':             [1,  14],
  },
  2032: {
    'Eid ul-Fitr':        [1,  14],
    'Holi':               [3,  13],
    'Ugadi / Gudi Padwa': [3,  21],
    'Ram Navami':         [3,  20],
    'Raksha Bandhan':     [8,  17],
    'Janmashtami':        [8,   6],
    'Ganesh Chaturthi':   [8,  10],
    'Onam':               [8,  27],
    'Navratri':           [10,  3],
    'Dussehra':           [10, 13],
    'Diwali':             [10, 20],
    'Pongal':             [1,  15],
  },
  2033: {
    'Eid ul-Fitr':        [1,   3],
    'Holi':               [3,   2],
    'Ugadi / Gudi Padwa': [3,  10],
    'Ram Navami':         [3,   9],
    'Raksha Bandhan':     [8,   5],
    'Janmashtami':        [8,  25],
    'Ganesh Chaturthi':   [8,  29],
    'Onam':               [9,  14],
    'Navratri':           [9,  22],
    'Dussehra':           [10,  2],
    'Diwali':             [10, 10],
    'Pongal':             [1,  14],
  },
  2034: {
    'Eid ul-Fitr':        [12, 22],  // Dec of prev year shift
    'Holi':               [3,  20],
    'Ugadi / Gudi Padwa': [3,  29],
    'Ram Navami':         [3,  28],
    'Raksha Bandhan':     [8,  24],
    'Janmashtami':        [8,  14],
    'Ganesh Chaturthi':   [8,  18],
    'Onam':               [9,   4],
    'Navratri':           [10, 11],
    'Dussehra':           [10, 21],
    'Diwali':             [10, 29],
    'Pongal':             [1,  14],
  },
  2035: {
    'Eid ul-Fitr':        [12, 11],
    'Holi':               [3,  10],
    'Ugadi / Gudi Padwa': [3,  18],
    'Ram Navami':         [3,  17],
    'Raksha Bandhan':     [8,  13],
    'Janmashtami':        [8,   3],
    'Ganesh Chaturthi':   [8,   7],
    'Onam':               [8,  24],
    'Navratri':           [10,  1],
    'Dussehra':           [10, 10],
    'Diwali':             [10, 18],
    'Pongal':             [1,  14],
  },
};

/**
 * Returns the correct { month, day } for a festival in a given year.
 * - Fixed festivals: returned as-is (month+day doesn't change).
 * - Easter / Mother's Day / Father's Day: calculated algorithmically.
 * - Hindu/Islamic: looked up from LUNAR_FESTIVAL_CALENDAR; falls back to previous year if not found.
 */
function getFestivalDate(
  eventName: string,
  month: number,
  day: number,
  year: number,
): { month: number; day: number } {
  // Algorithmically computed festivals
  if (eventName === 'Easter') {
    return calculateEaster(year);
  }
  if (eventName === "Mother's Day") {
    return { month: 5, day: getNthWeekday(year, 5, 0, 2) }; // 2nd Sunday of May
  }
  if (eventName === "Father's Day") {
    return { month: 6, day: getNthWeekday(year, 6, 0, 3) }; // 3rd Sunday of June
  }

  // Lunar calendar lookup
  const yearCalendar = LUNAR_FESTIVAL_CALENDAR[year];
  if (yearCalendar?.[eventName]) {
    const [m, d] = yearCalendar[eventName];
    return { month: m, day: d };
  }

  // Fallback: previous year's entry (better than nothing)
  for (let y = year - 1; y >= 2025; y--) {
    const prev = LUNAR_FESTIVAL_CALENDAR[y];
    if (prev?.[eventName]) {
      const [m, d] = prev[eventName];
      return { month: m, day: d };
    }
  }

  // Last resort: keep stored month+day unchanged
  return { month, day };
}

// ─── Fixed-date system festivals (month+day never changes) ──────────────────

const SYSTEM_FESTIVALS = [
  // Fixed — no update needed each year
  { event_name: 'New Year',              month: 1,  day: 1  },
  { event_name: 'Makar Sankranti',       month: 1,  day: 14 },
  { event_name: 'Republic Day',          month: 1,  day: 26 },
  { event_name: "Valentine's Day",       month: 2,  day: 14 },
  { event_name: "Women's Day",           month: 3,  day: 8  },
  { event_name: 'World Dentist Day',     month: 3,  day: 6  },
  { event_name: 'World Oral Health Day', month: 3,  day: 20 },
  { event_name: 'World Health Day',      month: 4,  day: 7  },
  { event_name: 'Independence Day',      month: 8,  day: 15 },
  { event_name: "Teacher's Day",         month: 9,  day: 5  },
  { event_name: "Children's Day",        month: 11, day: 14 },
  { event_name: 'Christmas',             month: 12, day: 25 },
  // Variable — auto-updated Jan 1 via cron (algorithm or lookup table)
  { event_name: 'Eid ul-Fitr',           month: 3,  day: 20 },
  { event_name: 'Holi',                  month: 3,  day: 21 },
  { event_name: 'Ugadi / Gudi Padwa',    month: 3,  day: 19 },
  { event_name: 'Ram Navami',            month: 3,  day: 28 },
  { event_name: 'Easter',                month: 4,  day: 5  },
  { event_name: "Mother's Day",          month: 5,  day: 10 },
  { event_name: "Father's Day",          month: 6,  day: 21 },
  { event_name: 'Raksha Bandhan',        month: 8,  day: 23 },
  { event_name: 'Janmashtami',           month: 8,  day: 15 },
  { event_name: 'Ganesh Chaturthi',      month: 8,  day: 20 },
  { event_name: 'Onam',                  month: 9,  day: 1  },
  { event_name: 'Navratri',              month: 10, day: 13 },
  { event_name: 'Dussehra',             month: 10, day: 22 },
  { event_name: 'Diwali',               month: 10, day: 28 },
  { event_name: 'Pongal',               month: 1,  day: 14 },
];

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ClinicEventsService {
  private readonly logger = new Logger(ClinicEventsService.name);
  private seeded = false;
  /** Promise lock — prevents concurrent seed runs from duplicating records. */
  private seedingPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Seed default Indian festivals as system events (clinic_id = null).
   *  Safe to call concurrently — uses a promise lock and name-based upsert (no delete). */
  async seedSystemEvents(): Promise<void> {
    if (this.seeded) return;
    // All concurrent callers share the same in-flight promise
    if (!this.seedingPromise) {
      this.seedingPromise = this._doSeed().finally(() => {
        this.seedingPromise = null;
      });
    }
    return this.seedingPromise;
  }

  private async _doSeed(): Promise<void> {
    if (this.seeded) return;

    const currentYear = new Date().getFullYear();

    // Remove duplicates first (keep oldest record per event_name)
    await this._deduplicateSystemEvents();

    // Fetch existing system events keyed by name
    const existing = await this.prisma.clinicEvent.findMany({
      where: { clinic_id: null },
      select: { id: true, event_name: true },
    });
    const existingByName = new Map(existing.map((e) => [e.event_name, e.id]));

    let created = 0;
    let skipped = 0;

    for (const f of SYSTEM_FESTIVALS) {
      if (existingByName.has(f.event_name)) {
        skipped++;
        continue;
      }
      const { month, day } = getFestivalDate(f.event_name, f.month, f.day, currentYear);
      await this.prisma.clinicEvent.create({
        data: {
          clinic_id: null,
          event_name: f.event_name,
          event_date: new Date(currentYear, month - 1, day),
          is_recurring: true,
          is_enabled: true,
          send_offer: false,
        },
      });
      created++;
    }

    if (created > 0 || skipped > 0) {
      this.logger.log(`Festival seed: ${created} created, ${skipped} already existed (${currentYear}).`);
    }

    this.seeded = true;
  }

  /** Remove duplicate system events, keeping the oldest record per event_name. */
  private async _deduplicateSystemEvents(): Promise<void> {
    const all = await this.prisma.clinicEvent.findMany({
      where: { clinic_id: null },
      orderBy: { created_at: 'asc' },
      select: { id: true, event_name: true },
    });

    const seen = new Set<string>();
    const duplicateIds: string[] = [];

    for (const event of all) {
      if (seen.has(event.event_name)) {
        duplicateIds.push(event.id);
      } else {
        seen.add(event.event_name);
      }
    }

    if (duplicateIds.length > 0) {
      await this.prisma.clinicEvent.deleteMany({ where: { id: { in: duplicateIds } } });
      this.logger.log(`Removed ${duplicateIds.length} duplicate system festival events.`);
    }
  }

  /**
   * Called automatically by the Jan 1 cron.
   * Updates all system festival event_dates to the new year's correct dates.
   * Clinic-level overrides are NOT touched — staff manage those themselves.
   */
  async refreshSystemFestivalDatesForYear(year: number): Promise<void> {
    this.logger.log(`Refreshing system festival dates for ${year}...`);

    const systemEvents = await this.prisma.clinicEvent.findMany({
      where: { clinic_id: null },
    });

    let updated = 0;
    for (const event of systemEvents) {
      const storedMonth = event.event_date.getMonth() + 1;
      const storedDay = event.event_date.getDate();
      const { month, day } = getFestivalDate(event.event_name, storedMonth, storedDay, year);
      const newDate = new Date(year, month - 1, day);

      await this.prisma.clinicEvent.update({
        where: { id: event.id },
        data: { event_date: newDate },
      });
      updated++;
    }

    this.logger.log(`Updated ${updated} system festival dates for ${year}.`);
  }

  /** Get all events (system + clinic-specific) */
  async findAll(clinicId: string) {
    await this.seedSystemEvents();

    return this.prisma.clinicEvent.findMany({
      where: {
        OR: [
          { clinic_id: null },
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
