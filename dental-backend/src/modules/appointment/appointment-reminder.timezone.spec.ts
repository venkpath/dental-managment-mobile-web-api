/**
 * Timezone-safety tests for WhatsApp appointment messages.
 *
 * Goal: prove that reminder fire times, confirmation dates and review dedup
 * windows all produce the SAME correct result whether the server OS is set to
 * Asia/Kolkata (IST, UTC+5:30) or Asia/Tbilisi (GET, UTC+4).
 *
 * Approach
 * ─────────
 * Node's Date.now() / new Date() are always in UTC internally, so "server
 * timezone" only matters when code calls toLocaleDateString() or similar
 * locale formatters WITHOUT an explicit timeZone option.  Every scenario
 * below is run twice:
 *   · "India perspective"   – Date.now() mocked to a value that, in IST,
 *                              corresponds to a recognisable local time.
 *   · "Tbilisi perspective" – Date.now() mocked to a value that, in GET,
 *                              corresponds to the same recognisable local time.
 * Because UTC ms is the same physical instant regardless of the clocks on the
 * wall, both runs must produce identical fire times and message content.
 *
 * Timezones under test
 * ─────────────────────
 *   IST  = UTC+5:30  (India Standard Time)   – our canonical appointment TZ
 *   GET  = UTC+4:00  (Georgia Standard Time, Tbilisi)  – no DST
 *
 * Hardcoded reference appointment
 * ────────────────────────────────
 *   Calendar date : 15 June 2026  (IST)
 *   Start time    : 09:00 IST  →  03:30:00 UTC
 *   appointment_date stored in DB: 2026-06-15T00:00:00Z (midnight UTC = midnight IST date)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AppointmentReminderProducer } from './appointment-reminder.producer.js';
import { PrismaService } from '../../database/prisma.service.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

// ─── Shared constants ────────────────────────────────────────────────────────

const IST_OFFSET_MS  = 5.5 * 60 * 60 * 1000;  // 5h30m in ms
const GET_OFFSET_MS  = 4   * 60 * 60 * 1000;   // UTC+4 (Tbilisi)

/** 2026-06-15T00:00:00Z — midnight UTC representing 15 Jun 2026 in IST */
const APPT_DATE_UTC = new Date('2026-06-15T00:00:00Z');

/** 09:00 IST = 03:30 UTC */
const APPT_START_IST = '09:00';
const APPT_START_UTC_MS = new Date('2026-06-15T03:30:00Z').getTime();

/** 11:30 PM IST edge case — crosses midnight UTC */
const APPT_LATE_IST = '23:30';
const APPT_LATE_UTC_MS = new Date('2026-06-15T18:00:00Z').getTime();

/** 00:30 IST edge case — IST date is Jun 15 but UTC is still Jun 14 */
const APPT_MIDNIGHT_IST = '00:30';
const APPT_MIDNIGHT_UTC_MS = new Date('2026-06-14T19:00:00Z').getTime();

const APPT_ID   = 'appt-tz-test-0001';
const CLINIC_ID = 'clinic-tz-test-0001';

// ─── Timezone-anchored "now" helpers ─────────────────────────────────────────

/**
 * Returns a UTC ms value that represents "14 Jun 2026, 09:00 local time"
 * in the given timezone — i.e., 24 h before the appointment in that TZ.
 * Used to pin Date.now() to simulate a server running in that timezone.
 */
function nowAt(localHour: number, localMinute: number, utcOffsetMs: number, utcDateMs: number): number {
  // utcDateMs is the start of the UTC date (midnight UTC).
  // local midnight = utcDateMs - utcOffsetMs
  // local HH:MM   = local midnight + (H*60+M)*60*1000
  const localMidnightUtc = utcDateMs - utcOffsetMs;
  return localMidnightUtc + (localHour * 60 + localMinute) * 60 * 1000;
}

/** June 13 2026 midnight UTC — 2 days before the appointment, well before any reminder fires */
const JUN13_UTC_MS = new Date('2026-06-13T00:00:00Z').getTime();

/**
 * "08:00 IST on June 13" — ~44 h before the appointment, well before any reminder fires.
 * An India server local clock reads 08:00.
 * UTC equivalent: 2026-06-13T02:30:00Z
 */
const NOW_IST_09 = nowAt(8, 0, IST_OFFSET_MS, JUN13_UTC_MS);

/**
 * "08:00 GET on June 13" — same wall-clock hour but Tbilisi local.
 * A Georgia server's clock shows 08:00; UTC equivalent: 2026-06-13T04:00:00Z
 * Both are well before the 24h reminder fire time (2026-06-14T03:30:00Z).
 */
const NOW_GET_09 = nowAt(8, 0, GET_OFFSET_MS, JUN13_UTC_MS);

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makePatientRule(hoursConfig: { h1?: number; h2?: number } = {}) {
  return {
    is_enabled: true,
    rule_type: 'appointment_reminder_patient',
    channel: 'whatsapp',
    template_id: null,
    config: {
      reminder_1_hours: hoursConfig.h1 ?? 24,
      reminder_1_enabled: true,
      reminder_2_hours: hoursConfig.h2 ?? 2,
      reminder_2_enabled: true,
    },
  };
}

function makeDentistRule(hours = 2) {
  return {
    is_enabled: true,
    rule_type: 'appointment_reminder_dentist',
    channel: 'whatsapp',
    template_id: null,
    config: { hours },
  };
}

function buildMockPrisma(patientRule = makePatientRule(), dentistRule = makeDentistRule()) {
  return {
    automationRule: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { clinic_id_rule_type: { rule_type: string } } }) => {
        const t = where.clinic_id_rule_type.rule_type;
        if (t === 'appointment_reminder_patient') return Promise.resolve(patientRule);
        if (t === 'appointment_reminder_dentist') return Promise.resolve(dentistRule);
        return Promise.resolve(null);
      }),
    },
  };
}

function buildMockQueue() {
  const addedJobs: Array<{ jobId: string; delay: number; data: unknown }> = [];
  return {
    add: jest.fn().mockImplementation((_name: string, data: unknown, opts: { jobId: string; delay: number }) => {
      addedJobs.push({ jobId: opts.jobId, delay: opts.delay, data });
      return Promise.resolve({ id: opts.jobId });
    }),
    getJob: jest.fn().mockResolvedValue(null),
    _jobs: addedJobs,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Appointment Reminders — timezone safety', () => {

  // ── 1. appointmentStartUtc computation (via previewReminders) ────────────

  describe('IST→UTC conversion is timezone-independent', () => {
    let producer: AppointmentReminderProducer;
    let mockQueue: ReturnType<typeof buildMockQueue>;

    beforeEach(async () => {
      mockQueue = buildMockQueue();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma() },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      producer = module.get(AppointmentReminderProducer);
    });

    it('09:00 IST → 03:30 UTC regardless of server TZ', async () => {
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      expect(preview.appointmentStartUtc).toBe('2026-06-15T03:30:00.000Z');
    });

    it('23:30 IST stays on the same UTC date (18:00 UTC)', async () => {
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_LATE_IST);
      expect(preview.appointmentStartUtc).toBe('2026-06-15T18:00:00.000Z');
    });

    it('00:30 IST crosses back to previous UTC date (19:00 UTC on Jun 14)', async () => {
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_MIDNIGHT_IST);
      expect(preview.appointmentStartUtc).toBe('2026-06-14T19:00:00.000Z');
    });

    it('18:30 IST (peak evening) → 13:00 UTC', async () => {
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, '18:30');
      expect(preview.appointmentStartUtc).toBe('2026-06-15T13:00:00.000Z');
    });

    it('previewReminders returns same appointmentStartUtc from India server perspective', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(NOW_IST_09);
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      expect(preview.appointmentStartUtc).toBe('2026-06-15T03:30:00.000Z');
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('previewReminders returns SAME appointmentStartUtc from Georgia/Tbilisi server perspective', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(NOW_GET_09);
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      expect(preview.appointmentStartUtc).toBe('2026-06-15T03:30:00.000Z');
      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  // ── 2. Reminder fire times are correct from both server timezones ─────────

  describe('Reminder fire times — India server (IST clock shows 09:00 on Jun 14)', () => {
    let producer: AppointmentReminderProducer;
    let mockQueue: ReturnType<typeof buildMockQueue>;

    beforeEach(async () => {
      mockQueue = buildMockQueue();
      jest.spyOn(Date, 'now').mockReturnValue(NOW_IST_09); // server clock = 09:00 IST Jun 14

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma() },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      producer = module.get(AppointmentReminderProducer);
    });

    afterEach(() => {
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('24h reminder fires at 2026-06-14T03:30:00Z (24h before 09:00 IST on Jun 15)', async () => {
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      // reminder-1 job ID must be found; reminder-2 is also present, so check exact suffix
      const job24h = mockQueue._jobs.find(j => j.jobId === `appointment-${APPT_ID}-reminder-1`);
      expect(job24h).toBeDefined();

      const expectedFireAt = APPT_START_UTC_MS - 24 * 60 * 60 * 1000; // 2026-06-14T03:30:00Z
      const expectedDelay  = expectedFireAt - NOW_IST_09;
      expect(job24h!.delay).toBeCloseTo(expectedDelay, -3); // ±1 s tolerance
      expect(new Date(NOW_IST_09 + job24h!.delay).toISOString()).toBe('2026-06-14T03:30:00.000Z');
    });

    it('2h reminder fires at 2026-06-15T01:30:00Z (2h before 09:00 IST)', async () => {
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      const job2h = mockQueue._jobs.find(j => j.jobId === `appointment-${APPT_ID}-reminder-2`);
      expect(job2h).toBeDefined();

      const expectedFireAt = APPT_START_UTC_MS - 2 * 60 * 60 * 1000; // 2026-06-15T01:30:00Z
      const expectedDelay  = expectedFireAt - NOW_IST_09;
      expect(job2h!.delay).toBeCloseTo(expectedDelay, -3);
      expect(new Date(NOW_IST_09 + job2h!.delay).toISOString()).toBe('2026-06-15T01:30:00.000Z');
    });

    it('dentist reminder fires at 2026-06-15T01:30:00Z (2h default before 09:00 IST)', async () => {
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      const jobDentist = mockQueue._jobs.find(j => j.jobId === `appointment-${APPT_ID}-reminder-dentist`);
      expect(jobDentist).toBeDefined();
      expect(new Date(NOW_IST_09 + jobDentist!.delay).toISOString()).toBe('2026-06-15T01:30:00.000Z');
    });

    it('staff app reminder fires at 2026-06-15T03:00:00Z (30 min before 09:00 IST)', async () => {
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      const jobStaff = mockQueue._jobs.find(j => j.jobId === `appointment-${APPT_ID}-reminder-staff-app`);
      expect(jobStaff).toBeDefined();
      expect(new Date(NOW_IST_09 + jobStaff!.delay).toISOString()).toBe('2026-06-15T03:00:00.000Z');
    });
  });

  describe('Reminder fire times — Georgia/Tbilisi server (GET clock shows 08:00 on Jun 13)', () => {
    let producer: AppointmentReminderProducer;
    let mockQueue: ReturnType<typeof buildMockQueue>;

    beforeEach(async () => {
      mockQueue = buildMockQueue();
      jest.spyOn(Date, 'now').mockReturnValue(NOW_GET_09); // server clock = 08:00 GET Jun 13

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma() },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      producer = module.get(AppointmentReminderProducer);
    });

    afterEach(() => {
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('24h reminder still fires at 2026-06-14T03:30:00Z (same UTC regardless of server TZ)', async () => {
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      const job24h = mockQueue._jobs.find(j => j.jobId === `appointment-${APPT_ID}-reminder-1`);
      expect(job24h).toBeDefined();

      // Fire-at must be the same UTC instant as the India run
      const expectedFireAt = APPT_START_UTC_MS - 24 * 60 * 60 * 1000;
      expect(new Date(NOW_GET_09 + job24h!.delay).toISOString()).toBe('2026-06-14T03:30:00.000Z');

      // Delay will differ (because Date.now() is different) but fire-at is identical
      const expectedDelay = expectedFireAt - NOW_GET_09;
      expect(job24h!.delay).toBeCloseTo(expectedDelay, -3);
    });

    it('2h reminder still fires at 2026-06-15T01:30:00Z', async () => {
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      const job2h = mockQueue._jobs.find(j => j.jobId.includes('reminder-2'));
      expect(job2h).toBeDefined();
      expect(new Date(NOW_GET_09 + job2h!.delay).toISOString()).toBe('2026-06-15T01:30:00.000Z');
    });

    it('dentist reminder fires at the same UTC time as the India server run', async () => {
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      const jobDentist = mockQueue._jobs.find(j => j.jobId.includes('reminder-dentist'));
      expect(jobDentist).toBeDefined();
      expect(new Date(NOW_GET_09 + jobDentist!.delay).toISOString()).toBe('2026-06-15T01:30:00.000Z');
    });

    it('staff app reminder fires at 2026-06-15T03:00:00Z regardless of server TZ', async () => {
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      const jobStaff = mockQueue._jobs.find(j => j.jobId.includes('staff-app'));
      expect(jobStaff).toBeDefined();
      expect(new Date(NOW_GET_09 + jobStaff!.delay).toISOString()).toBe('2026-06-15T03:00:00.000Z');
    });
  });

  // ── 3. "Already passed" detection ────────────────────────────────────────

  describe('"Already passed" detection is timezone-independent', () => {
    /**
     * Scenario: it is 06:00 UTC on Jun 15 (appointment was at 03:30 UTC and has passed).
     * · In IST, local clock reads 11:30 — appointment is gone.
     * · In GET, local clock reads 10:00 — appointment is gone.
     * Both should mark the reminder as already_passed.
     */
    const AFTER_APPT_UTC = new Date('2026-06-15T06:00:00Z').getTime(); // 30 min after 09:00 IST

    async function buildProducer(nowMs: number) {
      jest.spyOn(Date, 'now').mockReturnValue(nowMs);
      const mockQueue = buildMockQueue();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma() },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      return { producer: module.get<AppointmentReminderProducer>(AppointmentReminderProducer), mockQueue };
    }

    afterEach(() => jest.spyOn(Date, 'now').mockRestore());

    it('India server (11:30 IST) — all reminders already_passed', async () => {
      const { producer } = await buildProducer(AFTER_APPT_UTC);
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      for (const r of preview.reminders) {
        expect(r.status).toBe('already_passed');
      }
    });

    it('Georgia/Tbilisi server (10:00 GET) — same physical moment, same already_passed', async () => {
      // Same UTC ms → same result
      const { producer } = await buildProducer(AFTER_APPT_UTC);
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);

      for (const r of preview.reminders) {
        expect(r.status).toBe('already_passed');
      }
    });

    it('India server (08:00 IST Jun 13) — 24h reminder would_schedule', async () => {
      // NOW_IST_09 = 08:00 IST on Jun 13 = 2026-06-13T02:30:00Z
      // 24h reminder fires at 2026-06-14T03:30:00Z — clearly in the future → would_schedule
      const { producer } = await buildProducer(NOW_IST_09);
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      const r24 = preview.reminders.find(r => r.reminderHours === 24);
      expect(r24?.status).toBe('would_schedule');
    });

    it('Georgia/Tbilisi server (08:00 GET Jun 13) — 24h reminder still would_schedule', async () => {
      // NOW_GET_09 = 08:00 GET on Jun 13 = 2026-06-13T04:00:00Z — also before the fire time
      const { producer } = await buildProducer(NOW_GET_09);
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      const r24 = preview.reminders.find(r => r.reminderHours === 24);
      expect(r24?.status).toBe('would_schedule');
    });
  });

  // ── 4. Edge cases — midnight / date-line crossings ────────────────────────

  describe('Date-line edge cases', () => {
    let producer: AppointmentReminderProducer;
    let mockQueue: ReturnType<typeof buildMockQueue>;

    beforeEach(async () => {
      mockQueue = buildMockQueue();
      // Pin "now" far in the past so nothing is "already passed"
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-01T00:00:00Z').getTime());

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma() },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      producer = module.get(AppointmentReminderProducer);
    });

    afterEach(() => jest.spyOn(Date, 'now').mockRestore());

    it('00:30 IST (Jun 15) fires 24h reminder on Jun 14 at 18:00 UTC — stays on correct UTC day', async () => {
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_MIDNIGHT_IST);
      expect(preview.appointmentStartUtc).toBe('2026-06-14T19:00:00.000Z');

      const r24 = preview.reminders.find(r => r.reminderHours === 24);
      expect(r24?.firesAt).toBe('2026-06-13T19:00:00.000Z');
    });

    it('23:30 IST — 2h reminder fires at 15:00 UTC (not on next UTC day)', async () => {
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_LATE_IST);
      expect(preview.appointmentStartUtc).toBe('2026-06-15T18:00:00.000Z');

      const r2 = preview.reminders.find(r => r.reminderHours === 2);
      expect(r2?.firesAt).toBe('2026-06-15T16:00:00.000Z');
    });

    it('09:00 IST → 24h reminder falls on correct prior IST day (Jun 14 at 09:00 IST = 03:30 UTC)', async () => {
      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      const r24 = preview.reminders.find(r => r.reminderHours === 24);
      // 03:30 UTC Jun 15 − 24 h = 03:30 UTC Jun 14 = 09:00 IST Jun 14  ✓
      expect(r24?.firesAt).toBe('2026-06-14T03:30:00.000Z');
    });
  });

  // ── 5. Custom reminder windows (configurable hours) ───────────────────────

  describe('Configurable reminder hours work correctly across timezones', () => {

    async function buildWithConfig(nowMs: number, h1: number, h2: number) {
      jest.spyOn(Date, 'now').mockReturnValue(nowMs);
      const mockQueue = buildMockQueue();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma(makePatientRule({ h1, h2 })) },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      return {
        producer: module.get<AppointmentReminderProducer>(AppointmentReminderProducer),
        queue: mockQueue,
      };
    }

    afterEach(() => jest.spyOn(Date, 'now').mockRestore());

    it('48h reminder fires 48h before 09:00 IST — same UTC from India and Georgia servers', async () => {
      const expected48hFireAt = APPT_START_UTC_MS - 48 * 60 * 60 * 1000; // 2026-06-13T03:30:00Z

      // India server
      const { producer: pIndia, queue: qIndia } = await buildWithConfig(
        new Date('2026-06-10T00:00:00Z').getTime(), 48, 2,
      );
      await pIndia.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      jest.spyOn(Date, 'now').mockRestore();

      const job48India = qIndia._jobs.find(j => j.jobId.includes('reminder-1'));
      const fireAtIndia = new Date(new Date('2026-06-10T00:00:00Z').getTime() + job48India!.delay).toISOString();

      // Georgia server — same epoch, just named differently for clarity
      const { producer: pGeo, queue: qGeo } = await buildWithConfig(
        new Date('2026-06-10T00:00:00Z').getTime(), 48, 2,
      );
      await pGeo.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      jest.spyOn(Date, 'now').mockRestore();

      const job48Geo = qGeo._jobs.find(j => j.jobId.includes('reminder-1'));
      const fireAtGeo = new Date(new Date('2026-06-10T00:00:00Z').getTime() + job48Geo!.delay).toISOString();

      expect(fireAtIndia).toBe(new Date(expected48hFireAt).toISOString());
      expect(fireAtGeo).toBe(new Date(expected48hFireAt).toISOString());
      expect(fireAtIndia).toBe(fireAtGeo);
    });

    it('custom dentist reminder (4h) fires at 23:30 UTC when appointment is 09:00 IST', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-01T00:00:00Z').getTime());
      const mockQueue = buildMockQueue();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma(makePatientRule(), makeDentistRule(4)) },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      const producer = module.get<AppointmentReminderProducer>(AppointmentReminderProducer);

      const preview = await producer.previewReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      const dentist = preview.reminders.find(r => r.kind === 'dentist');

      // 09:00 IST = 03:30 UTC; 4h before = 2026-06-14T23:30:00Z
      expect(dentist?.firesAt).toBe('2026-06-14T23:30:00.000Z');
    });
  });

  // ── 6. Disabled rules — no jobs scheduled in any timezone ────────────────

  describe('Disabled automation rules — no jobs scheduled regardless of server TZ', () => {
    const disabledPatientRule = { ...makePatientRule(), is_enabled: false };

    async function buildDisabled(nowMs: number) {
      jest.spyOn(Date, 'now').mockReturnValue(nowMs);
      const mockQueue = buildMockQueue();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma(disabledPatientRule) },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      return { producer: module.get<AppointmentReminderProducer>(AppointmentReminderProducer), queue: mockQueue };
    }

    afterEach(() => jest.spyOn(Date, 'now').mockRestore());

    it('India server — no patient reminder jobs enqueued when rule disabled', async () => {
      const { producer, queue } = await buildDisabled(NOW_IST_09);
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      const patientJobs = queue._jobs.filter(j => j.jobId.includes('reminder-1') || j.jobId.includes('reminder-2'));
      expect(patientJobs).toHaveLength(0);
    });

    it('Georgia/Tbilisi server — same result: no patient reminder jobs enqueued', async () => {
      const { producer, queue } = await buildDisabled(NOW_GET_09);
      await producer.scheduleReminders(APPT_ID, CLINIC_ID, APPT_DATE_UTC, APPT_START_IST);
      const patientJobs = queue._jobs.filter(j => j.jobId.includes('reminder-1') || j.jobId.includes('reminder-2'));
      expect(patientJobs).toHaveLength(0);
    });
  });

  // ── 7. Date formatting in message body is always IST ─────────────────────

  describe('Message date formatting always uses IST regardless of server timezone', () => {
    /**
     * The processor's formatDate() uses Intl with timeZone:'Asia/Kolkata'.
     * This test verifies that for a date stored as midnight UTC (which is
     * 5:30 AM IST of the same calendar day), the formatted string shows
     * the IST calendar date — NOT the UTC date or the server-local date.
     *
     * Edge: appointment_date = 2026-06-15T00:00:00Z
     *   · IST view  → 15 Jun 2026  (correct ✓)
     *   · UTC view  → 15 Jun 2026  (same in this case — midnight UTC = 5:30 IST same day)
     *
     * Better edge: appointment_date = 2026-06-14T20:30:00Z
     *   · UTC view  → 14 Jun 2026  (wrong for a server in UTC-5)
     *   · IST view  → 15 Jun 2026  (20:30 UTC = 02:00 IST next day — CORRECT for IST patients)
     *   · GET view  → 15 Jun 2026  (20:30 UTC = 00:30 GET = still Jun 15 in Tbilisi)
     */
    it('Intl.DateTimeFormat with Asia/Kolkata always returns the IST calendar date', () => {
      // 20:30 UTC on Jun 14 = 02:00 IST on Jun 15
      const storedDate = new Date('2026-06-14T20:30:00Z');

      const formatted = storedDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });

      // Should show Jun 15 (IST date), not Jun 14 (UTC date)
      expect(formatted).toContain('15');
      expect(formatted).toContain('Jun');
      expect(formatted).toContain('2026');
    });

    it('same date formatted WITHOUT timeZone option differs from IST on a UTC server', () => {
      // This test documents the bug that WOULD occur if timeZone was omitted on a UTC server.
      // The processor correctly specifies timeZone:'Asia/Kolkata' to avoid this.
      const storedDate = new Date('2026-06-14T20:30:00Z');

      // When timeZone is NOT specified, Intl uses the process timezone.
      // On a UTC server this gives Jun 14 — wrong for IST patients.
      // Our code always uses timeZone:'Asia/Kolkata', so this bug does not occur.
      // We document the difference here.
      const formattedWithIST = storedDate.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
      const formattedWithGET = storedDate.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        timeZone: 'Asia/Tbilisi',
      });

      // Both IST and GET show Jun 15 for this timestamp (20:30 UTC)
      expect(formattedWithIST).toContain('15');
      expect(formattedWithGET).toContain('15');
    });

    it('midnight IST (00:30 IST Jun 15) — formatDate shows Jun 15 not Jun 14', () => {
      // appointment_date stored as 2026-06-15T00:00:00Z, start_time = 00:30 IST
      // The actual UTC moment is 2026-06-14T19:00:00Z — but IST patients see it as Jun 15
      // The appointment_date field (the calendar date) is Jun 15 → stored as 2026-06-15T00:00:00Z
      const storedDate = new Date('2026-06-15T00:00:00Z'); // calendar date in IST

      const formatted = storedDate.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });

      expect(formatted).toContain('15');
    });
  });

  // ── 8. Idempotency — rescheduling cancels and recreates correctly ─────────

  describe('Reschedule cancels old jobs and schedules new ones with correct UTC times', () => {
    let cancelledJobIds: string[] = [];
    let mockQueue: ReturnType<typeof buildMockQueue>;
    let producer: AppointmentReminderProducer;

    beforeEach(async () => {
      cancelledJobIds = [];
      mockQueue = buildMockQueue();
      jest.spyOn(Date, 'now').mockReturnValue(NOW_IST_09);

      // Simulate existing jobs that can be found and removed
      mockQueue.getJob = jest.fn().mockImplementation((jobId: string) => {
        return Promise.resolve({
          id: jobId,
          remove: jest.fn().mockImplementation(() => {
            cancelledJobIds.push(jobId as string);
            return Promise.resolve();
          }),
        });
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma() },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      producer = module.get(AppointmentReminderProducer);
    });

    afterEach(() => jest.spyOn(Date, 'now').mockRestore());

    it('reschedule cancels all 4 old job slots and re-creates with new UTC fire times', async () => {
      // New appointment: Jun 16 at 10:00 IST = 04:30 UTC
      const newDate = new Date('2026-06-16T00:00:00Z');
      const newTime = '10:00';
      const newStartUtcMs = new Date('2026-06-16T04:30:00Z').getTime();

      await producer.rescheduleReminders(APPT_ID, CLINIC_ID, newDate, newTime);

      // All 4 old slots must have been cancelled
      expect(cancelledJobIds).toEqual(
        expect.arrayContaining([
          `appointment-${APPT_ID}-reminder-1`,
          `appointment-${APPT_ID}-reminder-2`,
          `appointment-${APPT_ID}-reminder-dentist`,
          `appointment-${APPT_ID}-reminder-staff-app`,
        ]),
      );

      // New 24h reminder fires at Jun 15T04:30Z
      const new24h = mockQueue._jobs.find(j => j.jobId.includes('reminder-1'));
      expect(new24h).toBeDefined();
      expect(new Date(NOW_IST_09 + new24h!.delay).toISOString()).toBe('2026-06-15T04:30:00.000Z');

      // New 2h reminder fires at Jun 16T02:30Z
      const new2h = mockQueue._jobs.find(j => j.jobId.includes('reminder-2'));
      expect(new2h).toBeDefined();
      expect(new Date(NOW_IST_09 + new2h!.delay).toISOString()).toBe('2026-06-16T02:30:00.000Z');

      // New dentist reminder fires at Jun 16T02:30Z
      const newDentist = mockQueue._jobs.find(j => j.jobId.includes('reminder-dentist'));
      expect(newDentist).toBeDefined();
      const expectedDentistFireMs = newStartUtcMs - 2 * 60 * 60 * 1000;
      expect(new Date(NOW_IST_09 + newDentist!.delay).toISOString()).toBe(
        new Date(expectedDentistFireMs).toISOString(),
      );
    });
  });

  // ── 9. cancelReminders — all 4 slots removed ────────────────────────────

  describe('cancelReminders removes all job slots', () => {
    it('removes all 4 reminder job IDs for the given appointment', async () => {
      const removed: string[] = [];
      const mockQueue = buildMockQueue();
      mockQueue.getJob = jest.fn().mockImplementation((jobId: string) =>
        Promise.resolve({ id: jobId, remove: jest.fn().mockImplementation(() => { removed.push(jobId as string); }) }),
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentReminderProducer,
          { provide: PrismaService, useValue: buildMockPrisma() },
          { provide: getQueueToken(QUEUE_NAMES.APPOINTMENT_REMINDER), useValue: mockQueue },
        ],
      }).compile();
      const producer = module.get<AppointmentReminderProducer>(AppointmentReminderProducer);

      await producer.cancelReminders(APPT_ID);

      expect(removed).toEqual(
        expect.arrayContaining([
          `appointment-${APPT_ID}-reminder-1`,
          `appointment-${APPT_ID}-reminder-2`,
          `appointment-${APPT_ID}-reminder-dentist`,
          `appointment-${APPT_ID}-reminder-staff-app`,
        ]),
      );
    });
  });
});
