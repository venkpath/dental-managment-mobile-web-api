"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicBookingModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const public_booking_controller_js_1 = require("./public-booking.controller.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const appointment_reminder_producer_js_1 = require("../appointment/appointment-reminder.producer.js");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
let PublicBookingModule = class PublicBookingModule {
};
exports.PublicBookingModule = PublicBookingModule;
exports.PublicBookingModule = PublicBookingModule = __decorate([
    (0, common_1.Module)({
        imports: [bullmq_1.BullModule.registerQueue({ name: queue_names_js_1.QUEUE_NAMES.APPOINTMENT_REMINDER })],
        controllers: [public_booking_controller_js_1.PublicBookingController],
        providers: [prisma_service_js_1.PrismaService, appointment_reminder_producer_js_1.AppointmentReminderProducer],
    })
], PublicBookingModule);
//# sourceMappingURL=public-booking.module.js.map