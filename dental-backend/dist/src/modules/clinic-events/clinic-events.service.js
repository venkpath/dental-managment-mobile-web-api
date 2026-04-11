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
var ClinicEventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicEventsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
function calculateEaster(year) {
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
function getNthWeekday(year, month, weekday, n) {
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const firstOccurrence = 1 + ((weekday - firstDayOfMonth + 7) % 7);
    return firstOccurrence + (n - 1) * 7;
}
const LUNAR_FESTIVAL_CALENDAR = {
    2025: {
        'Eid ul-Fitr': [3, 31],
        'Holi': [3, 14],
        'Ugadi / Gudi Padwa': [3, 30],
        'Ram Navami': [4, 6],
        'Raksha Bandhan': [8, 9],
        'Janmashtami': [8, 16],
        'Ganesh Chaturthi': [8, 27],
        'Onam': [9, 5],
        'Navratri': [10, 2],
        'Dussehra': [10, 12],
        'Diwali': [10, 20],
        'Pongal': [1, 14],
    },
    2026: {
        'Eid ul-Fitr': [3, 20],
        'Holi': [3, 21],
        'Ugadi / Gudi Padwa': [3, 19],
        'Ram Navami': [3, 28],
        'Raksha Bandhan': [8, 23],
        'Janmashtami': [8, 15],
        'Ganesh Chaturthi': [8, 20],
        'Onam': [9, 1],
        'Navratri': [10, 13],
        'Dussehra': [10, 22],
        'Diwali': [10, 28],
        'Pongal': [1, 14],
    },
    2027: {
        'Eid ul-Fitr': [3, 10],
        'Holi': [3, 10],
        'Ugadi / Gudi Padwa': [3, 18],
        'Ram Navami': [4, 16],
        'Raksha Bandhan': [8, 13],
        'Janmashtami': [8, 4],
        'Ganesh Chaturthi': [8, 8],
        'Onam': [8, 25],
        'Navratri': [10, 1],
        'Dussehra': [10, 11],
        'Diwali': [10, 18],
        'Pongal': [1, 14],
    },
    2028: {
        'Eid ul-Fitr': [2, 27],
        'Holi': [3, 28],
        'Ugadi / Gudi Padwa': [4, 5],
        'Ram Navami': [4, 4],
        'Raksha Bandhan': [8, 1],
        'Janmashtami': [8, 22],
        'Ganesh Chaturthi': [8, 26],
        'Onam': [9, 11],
        'Navratri': [10, 19],
        'Dussehra': [10, 29],
        'Diwali': [11, 5],
        'Pongal': [1, 15],
    },
    2029: {
        'Eid ul-Fitr': [2, 16],
        'Holi': [3, 17],
        'Ugadi / Gudi Padwa': [3, 25],
        'Ram Navami': [3, 24],
        'Raksha Bandhan': [8, 19],
        'Janmashtami': [8, 9],
        'Ganesh Chaturthi': [8, 14],
        'Onam': [8, 31],
        'Navratri': [10, 8],
        'Dussehra': [10, 17],
        'Diwali': [10, 26],
        'Pongal': [1, 14],
    },
    2030: {
        'Eid ul-Fitr': [2, 5],
        'Holi': [3, 6],
        'Ugadi / Gudi Padwa': [4, 13],
        'Ram Navami': [4, 12],
        'Raksha Bandhan': [8, 9],
        'Janmashtami': [8, 28],
        'Ganesh Chaturthi': [9, 2],
        'Onam': [9, 18],
        'Navratri': [10, 27],
        'Dussehra': [11, 5],
        'Diwali': [11, 14],
        'Pongal': [1, 14],
    },
    2031: {
        'Eid ul-Fitr': [1, 25],
        'Holi': [3, 25],
        'Ugadi / Gudi Padwa': [4, 2],
        'Ram Navami': [4, 1],
        'Raksha Bandhan': [7, 30],
        'Janmashtami': [8, 17],
        'Ganesh Chaturthi': [8, 22],
        'Onam': [9, 7],
        'Navratri': [10, 16],
        'Dussehra': [10, 25],
        'Diwali': [11, 2],
        'Pongal': [1, 14],
    },
    2032: {
        'Eid ul-Fitr': [1, 14],
        'Holi': [3, 13],
        'Ugadi / Gudi Padwa': [3, 21],
        'Ram Navami': [3, 20],
        'Raksha Bandhan': [8, 17],
        'Janmashtami': [8, 6],
        'Ganesh Chaturthi': [8, 10],
        'Onam': [8, 27],
        'Navratri': [10, 3],
        'Dussehra': [10, 13],
        'Diwali': [10, 20],
        'Pongal': [1, 15],
    },
    2033: {
        'Eid ul-Fitr': [1, 3],
        'Holi': [3, 2],
        'Ugadi / Gudi Padwa': [3, 10],
        'Ram Navami': [3, 9],
        'Raksha Bandhan': [8, 5],
        'Janmashtami': [8, 25],
        'Ganesh Chaturthi': [8, 29],
        'Onam': [9, 14],
        'Navratri': [9, 22],
        'Dussehra': [10, 2],
        'Diwali': [10, 10],
        'Pongal': [1, 14],
    },
    2034: {
        'Eid ul-Fitr': [12, 22],
        'Holi': [3, 20],
        'Ugadi / Gudi Padwa': [3, 29],
        'Ram Navami': [3, 28],
        'Raksha Bandhan': [8, 24],
        'Janmashtami': [8, 14],
        'Ganesh Chaturthi': [8, 18],
        'Onam': [9, 4],
        'Navratri': [10, 11],
        'Dussehra': [10, 21],
        'Diwali': [10, 29],
        'Pongal': [1, 14],
    },
    2035: {
        'Eid ul-Fitr': [12, 11],
        'Holi': [3, 10],
        'Ugadi / Gudi Padwa': [3, 18],
        'Ram Navami': [3, 17],
        'Raksha Bandhan': [8, 13],
        'Janmashtami': [8, 3],
        'Ganesh Chaturthi': [8, 7],
        'Onam': [8, 24],
        'Navratri': [10, 1],
        'Dussehra': [10, 10],
        'Diwali': [10, 18],
        'Pongal': [1, 14],
    },
};
function getFestivalDate(eventName, month, day, year) {
    if (eventName === 'Easter') {
        return calculateEaster(year);
    }
    if (eventName === "Mother's Day") {
        return { month: 5, day: getNthWeekday(year, 5, 0, 2) };
    }
    if (eventName === "Father's Day") {
        return { month: 6, day: getNthWeekday(year, 6, 0, 3) };
    }
    const yearCalendar = LUNAR_FESTIVAL_CALENDAR[year];
    if (yearCalendar?.[eventName]) {
        const [m, d] = yearCalendar[eventName];
        return { month: m, day: d };
    }
    for (let y = year - 1; y >= 2025; y--) {
        const prev = LUNAR_FESTIVAL_CALENDAR[y];
        if (prev?.[eventName]) {
            const [m, d] = prev[eventName];
            return { month: m, day: d };
        }
    }
    return { month, day };
}
const SYSTEM_FESTIVALS = [
    { event_name: 'New Year', month: 1, day: 1 },
    { event_name: 'Makar Sankranti', month: 1, day: 14 },
    { event_name: 'Republic Day', month: 1, day: 26 },
    { event_name: "Valentine's Day", month: 2, day: 14 },
    { event_name: "Women's Day", month: 3, day: 8 },
    { event_name: 'World Dentist Day', month: 3, day: 6 },
    { event_name: 'World Oral Health Day', month: 3, day: 20 },
    { event_name: 'World Health Day', month: 4, day: 7 },
    { event_name: 'Independence Day', month: 8, day: 15 },
    { event_name: "Teacher's Day", month: 9, day: 5 },
    { event_name: "Children's Day", month: 11, day: 14 },
    { event_name: 'Christmas', month: 12, day: 25 },
    { event_name: 'Eid ul-Fitr', month: 3, day: 20 },
    { event_name: 'Holi', month: 3, day: 21 },
    { event_name: 'Ugadi / Gudi Padwa', month: 3, day: 19 },
    { event_name: 'Ram Navami', month: 3, day: 28 },
    { event_name: 'Easter', month: 4, day: 5 },
    { event_name: "Mother's Day", month: 5, day: 10 },
    { event_name: "Father's Day", month: 6, day: 21 },
    { event_name: 'Raksha Bandhan', month: 8, day: 23 },
    { event_name: 'Janmashtami', month: 8, day: 15 },
    { event_name: 'Ganesh Chaturthi', month: 8, day: 20 },
    { event_name: 'Onam', month: 9, day: 1 },
    { event_name: 'Navratri', month: 10, day: 13 },
    { event_name: 'Dussehra', month: 10, day: 22 },
    { event_name: 'Diwali', month: 10, day: 28 },
    { event_name: 'Pongal', month: 1, day: 14 },
];
let ClinicEventsService = ClinicEventsService_1 = class ClinicEventsService {
    prisma;
    logger = new common_1.Logger(ClinicEventsService_1.name);
    seeded = false;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async seedSystemEvents() {
        if (this.seeded)
            return;
        const currentYear = new Date().getFullYear();
        const existingCount = await this.prisma.clinicEvent.count({
            where: { clinic_id: null },
        });
        if (existingCount === SYSTEM_FESTIVALS.length) {
            this.seeded = true;
            return;
        }
        this.logger.log(existingCount === 0
            ? 'Seeding system festival events...'
            : `Re-seeding system festival events (found ${existingCount}, expected ${SYSTEM_FESTIVALS.length})...`);
        await this.prisma.clinicEvent.deleteMany({ where: { clinic_id: null } });
        const data = SYSTEM_FESTIVALS.map((f) => {
            const { month, day } = getFestivalDate(f.event_name, f.month, f.day, currentYear);
            return {
                clinic_id: null,
                event_name: f.event_name,
                event_date: new Date(currentYear, month - 1, day),
                is_recurring: true,
                is_enabled: true,
                send_offer: false,
            };
        });
        await this.prisma.clinicEvent.createMany({ data });
        this.seeded = true;
        this.logger.log(`Seeded ${data.length} system festival events for ${currentYear}.`);
    }
    async refreshSystemFestivalDatesForYear(year) {
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
    async findAll(clinicId) {
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
    async create(clinicId, dto) {
        return this.prisma.clinicEvent.create({
            data: {
                clinic_id: clinicId,
                event_name: dto.event_name,
                event_date: new Date(dto.event_date),
                is_recurring: dto.is_recurring ?? true,
                template_id: dto.template_id,
                send_offer: dto.send_offer ?? false,
                offer_details: dto.offer_details,
            },
        });
    }
    async update(clinicId, eventId, dto) {
        const event = await this.prisma.clinicEvent.findUnique({ where: { id: eventId } });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
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
                    offer_details: dto.offer_details ?? event.offer_details,
                },
            });
        }
        if (event.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Event not found');
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
                offer_details: dto.offer_details,
            },
        });
    }
    async remove(clinicId, eventId) {
        const event = await this.prisma.clinicEvent.findFirst({
            where: { id: eventId, clinic_id: clinicId },
        });
        if (!event)
            throw new common_1.NotFoundException('Clinic event not found');
        return this.prisma.clinicEvent.delete({ where: { id: eventId } });
    }
    async getUpcoming(clinicId, days = 30) {
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
};
exports.ClinicEventsService = ClinicEventsService;
exports.ClinicEventsService = ClinicEventsService = ClinicEventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ClinicEventsService);
//# sourceMappingURL=clinic-events.service.js.map