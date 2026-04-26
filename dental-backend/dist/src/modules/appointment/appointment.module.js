"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const appointment_controller_js_1 = require("./appointment.controller.js");
const appointment_service_js_1 = require("./appointment.service.js");
const appointment_notification_service_js_1 = require("./appointment-notification.service.js");
const appointment_reminder_producer_js_1 = require("./appointment-reminder.producer.js");
const appointment_reminder_processor_js_1 = require("./appointment-reminder.processor.js");
const automation_module_js_1 = require("../automation/automation.module.js");
const communication_module_js_1 = require("../communication/communication.module.js");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
let AppointmentModule = class AppointmentModule {
};
exports.AppointmentModule = AppointmentModule;
exports.AppointmentModule = AppointmentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            automation_module_js_1.AutomationModule,
            communication_module_js_1.CommunicationModule,
            bullmq_1.BullModule.registerQueue({ name: queue_names_js_1.QUEUE_NAMES.APPOINTMENT_REMINDER }),
        ],
        controllers: [appointment_controller_js_1.AppointmentController],
        providers: [
            appointment_service_js_1.AppointmentService,
            appointment_notification_service_js_1.AppointmentNotificationService,
            appointment_reminder_producer_js_1.AppointmentReminderProducer,
            appointment_reminder_processor_js_1.AppointmentReminderProcessor,
        ],
        exports: [appointment_service_js_1.AppointmentService],
    })
], AppointmentModule);
//# sourceMappingURL=appointment.module.js.map