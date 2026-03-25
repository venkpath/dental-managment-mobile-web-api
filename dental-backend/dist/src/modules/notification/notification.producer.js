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
exports.NotificationProducer = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
let NotificationProducer = class NotificationProducer {
    queue;
    constructor(queue) {
        this.queue = queue;
    }
    async enqueue(input) {
        await this.queue.add('create-notification', input);
    }
    async enqueueMany(inputs) {
        if (inputs.length === 0)
            return;
        await this.queue.addBulk(inputs.map((input) => ({ name: 'create-notification', data: input })));
    }
};
exports.NotificationProducer = NotificationProducer;
exports.NotificationProducer = NotificationProducer = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(queue_names_js_1.QUEUE_NAMES.NOTIFICATION)),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], NotificationProducer);
//# sourceMappingURL=notification.producer.js.map