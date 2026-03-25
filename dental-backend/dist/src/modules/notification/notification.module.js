"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const notification_controller_js_1 = require("./notification.controller.js");
const notification_service_js_1 = require("./notification.service.js");
const notification_producer_js_1 = require("./notification.producer.js");
const notification_processor_js_1 = require("./notification.processor.js");
const notification_cron_js_1 = require("./notification.cron.js");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [bullmq_1.BullModule.registerQueue({ name: queue_names_js_1.QUEUE_NAMES.NOTIFICATION })],
        controllers: [notification_controller_js_1.NotificationController],
        providers: [
            notification_service_js_1.NotificationService,
            notification_producer_js_1.NotificationProducer,
            notification_processor_js_1.NotificationProcessor,
            notification_cron_js_1.NotificationCronService,
        ],
        exports: [notification_service_js_1.NotificationService, notification_producer_js_1.NotificationProducer],
    })
], NotificationModule);
//# sourceMappingURL=notification.module.js.map