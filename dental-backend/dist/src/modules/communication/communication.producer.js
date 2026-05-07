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
var CommunicationProducer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationProducer = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
let CommunicationProducer = CommunicationProducer_1 = class CommunicationProducer {
    emailQueue;
    smsQueue;
    whatsappQueue;
    logger = new common_1.Logger(CommunicationProducer_1.name);
    constructor(emailQueue, smsQueue, whatsappQueue) {
        this.emailQueue = emailQueue;
        this.smsQueue = smsQueue;
        this.whatsappQueue = whatsappQueue;
    }
    async enqueue(job, options) {
        const queue = this.getQueue(job.channel);
        if (!queue) {
            this.logger.warn(`No queue for channel: ${job.channel}`);
            return;
        }
        const jobOptions = {
            attempts: options?.attempts ?? 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 500,
        };
        if (job.scheduledAt) {
            const delay = new Date(job.scheduledAt).getTime() - Date.now();
            if (delay > 0) {
                jobOptions.delay = delay;
            }
        }
        await queue.add(`send_${job.channel}`, job, jobOptions);
        this.logger.debug(`Job queued: ${job.channel} → ${job.to} (message: ${job.messageId})`);
    }
    async enqueueBulk(jobs) {
        if (jobs.length === 0)
            return;
        const grouped = new Map();
        for (const job of jobs) {
            const existing = grouped.get(job.channel) || [];
            existing.push(job);
            grouped.set(job.channel, existing);
        }
        for (const [channel, channelJobs] of grouped) {
            const queue = this.getQueue(channel);
            if (!queue)
                continue;
            await queue.addBulk(channelJobs.map((job) => ({
                name: `send_${channel}`,
                data: job,
                opts: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    removeOnComplete: 100,
                    removeOnFail: 500,
                },
            })));
            this.logger.debug(`${channelJobs.length} ${channel} jobs queued`);
        }
    }
    getQueue(channel) {
        switch (channel) {
            case 'email': return this.emailQueue;
            case 'sms': return this.smsQueue;
            case 'whatsapp': return this.whatsappQueue;
            default: return null;
        }
    }
};
exports.CommunicationProducer = CommunicationProducer;
exports.CommunicationProducer = CommunicationProducer = CommunicationProducer_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(queue_names_js_1.QUEUE_NAMES.COMMUNICATION_EMAIL)),
    __param(1, (0, bullmq_1.InjectQueue)(queue_names_js_1.QUEUE_NAMES.COMMUNICATION_SMS)),
    __param(2, (0, bullmq_1.InjectQueue)(queue_names_js_1.QUEUE_NAMES.COMMUNICATION_WHATSAPP)),
    __metadata("design:paramtypes", [Function, Function, Function])
], CommunicationProducer);
//# sourceMappingURL=communication.producer.js.map