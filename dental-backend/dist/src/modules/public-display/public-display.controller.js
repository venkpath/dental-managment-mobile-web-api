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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicDisplayController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let PublicDisplayController = class PublicDisplayController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRoomsByToken(token) {
        const branch = await this.prisma.branch.findUnique({
            where: { display_token: token },
            include: { clinic: { select: { name: true, logo_url: true } } },
        });
        if (!branch)
            throw new common_1.NotFoundException('Invalid or expired display link');
        if (!branch.display_token_enabled)
            throw new common_1.BadRequestException('This display link has been disabled');
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const rooms = await this.prisma.room.findMany({
            where: { branch_id: branch.id, is_active: true },
            include: {
                appointments: {
                    where: {
                        status: { in: ['checked_in', 'in_progress', 'scheduled'] },
                        appointment_date: { gte: startOfDay, lte: endOfDay },
                    },
                    include: {
                        patient: { select: { first_name: true, last_name: true } },
                        dentist: { select: { name: true } },
                    },
                    orderBy: { start_time: 'asc' },
                },
            },
            orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
        });
        const cleaningDuration = (branch.room_cleaning_duration_minutes ?? 2) * 60 * 1000;
        const updates = [];
        for (const room of rooms) {
            if (room.status === 'cleaning' && room.cleaning_started_at) {
                if (now.getTime() - room.cleaning_started_at.getTime() >= cleaningDuration) {
                    updates.push(this.prisma.room.update({
                        where: { id: room.id },
                        data: { status: 'available', cleaning_started_at: null },
                    }));
                    room.status = 'available';
                    room.cleaning_started_at = null;
                }
            }
        }
        if (updates.length > 0)
            await Promise.all(updates);
        return {
            clinic_name: branch.clinic.name,
            clinic_logo_url: branch.clinic.logo_url,
            branch_name: branch.name,
            room_cleaning_duration_minutes: branch.room_cleaning_duration_minutes ?? 2,
            rooms,
        };
    }
};
exports.PublicDisplayController = PublicDisplayController;
__decorate([
    (0, common_1.Get)(':token'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get live room status by display token — no auth required (used by TV/kiosk display)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Branch info and live room statuses' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicDisplayController.prototype, "getRoomsByToken", null);
exports.PublicDisplayController = PublicDisplayController = __decorate([
    (0, swagger_1.ApiTags)('Public Display'),
    (0, common_1.Controller)('public/display'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], PublicDisplayController);
//# sourceMappingURL=public-display.controller.js.map