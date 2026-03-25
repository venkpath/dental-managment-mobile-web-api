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
var NotificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
const notification_service_js_1 = require("./notification.service.js");
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor extends bullmq_1.WorkerHost {
    notificationService;
    logger = new common_1.Logger(NotificationProcessor_1.name);
    constructor(notificationService) {
        super();
        this.notificationService = notificationService;
    }
    async process(job) {
        try {
            await this.notificationService.create(job.data);
            this.logger.debug(`Notification created: ${job.data.type} for user ${job.data.user_id ?? 'broadcast'}`);
        }
        catch (error) {
            this.logger.error(`Failed to process notification job ${job.id}: ${error}`);
            throw error;
        }
    }
};
exports.NotificationProcessor = NotificationProcessor;
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_js_1.QUEUE_NAMES.NOTIFICATION),
    __metadata("design:paramtypes", [notification_service_js_1.NotificationService])
], NotificationProcessor);
//# sourceMappingURL=notification.processor.js.map