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
exports.PublicBookingController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const booking_url_util_js_1 = require("../../common/utils/booking-url.util.js");
let PublicBookingController = class PublicBookingController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBranchBookingInfo(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: branchId },
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true,
                country: true,
                phone: true,
                latitude: true,
                longitude: true,
                map_url: true,
                book_now_url: true,
                working_start_time: true,
                working_end_time: true,
                lunch_start_time: true,
                lunch_end_time: true,
                working_days: true,
                slot_duration: true,
                clinic: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        city: true,
                        state: true,
                        country: true,
                    },
                },
            },
        });
        if (!branch || branch.clinic.id !== clinicId) {
            throw new common_1.NotFoundException('Branch not found');
        }
        const bookingUrl = (0, booking_url_util_js_1.getBookingUrl)(clinicId, branchId, branch.book_now_url);
        return {
            clinic: branch.clinic,
            branch: {
                id: branch.id,
                name: branch.name,
                address: branch.address,
                city: branch.city,
                state: branch.state,
                country: branch.country,
                phone: branch.phone,
                latitude: branch.latitude,
                longitude: branch.longitude,
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
            booking_url: bookingUrl,
            has_custom_booking: !!branch.book_now_url,
        };
    }
};
exports.PublicBookingController = PublicBookingController;
__decorate([
    (0, common_1.Get)(':clinicId/:branchId'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get public branch booking info (no auth required)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Branch booking info' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Branch not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getBranchBookingInfo", null);
exports.PublicBookingController = PublicBookingController = __decorate([
    (0, swagger_1.ApiTags)('Public Booking'),
    (0, common_1.Controller)('public/booking'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], PublicBookingController);
//# sourceMappingURL=public-booking.controller.js.map