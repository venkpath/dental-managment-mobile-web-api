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
const SYSTEM_FESTIVALS = [
    { event_name: 'New Year', month: 1, day: 1 },
    { event_name: 'Makar Sankranti / Pongal', month: 1, day: 14 },
    { event_name: 'Republic Day', month: 1, day: 26 },
    { event_name: 'Valentine\'s Day', month: 2, day: 14 },
    { event_name: 'Holi', month: 3, day: 14 },
    { event_name: 'Women\'s Day', month: 3, day: 8 },
    { event_name: 'Ugadi / Gudi Padwa', month: 3, day: 30 },
    { event_name: 'Ram Navami', month: 4, day: 6 },
    { event_name: 'Easter', month: 4, day: 20 },
    { event_name: 'World Health Day', month: 4, day: 7 },
    { event_name: 'Mother\'s Day', month: 5, day: 11 },
    { event_name: 'Eid ul-Fitr', month: 3, day: 31 },
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
        if (existingCount > 0) {
            this.seeded = true;
            return;
        }
        this.logger.log('Seeding system festival events...');
        const data = SYSTEM_FESTIVALS.map((f) => ({
            clinic_id: null,
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