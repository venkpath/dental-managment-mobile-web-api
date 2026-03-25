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
var SmsWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const queue_names_js_1 = require("../../../common/queue/queue-names.js");
const sms_provider_js_1 = require("../providers/sms.provider.js");
const communication_service_js_1 = require("../communication.service.js");
let SmsWorker = SmsWorker_1 = class SmsWorker extends bullmq_1.WorkerHost {
    smsProvider;
    communicationService;
    logger = new common_1.Logger(SmsWorker_1.name);
    constructor(smsProvider, communicationService) {
        super();
        this.smsProvider = smsProvider;
        this.communicationService = communicationService;
    }
    async process(job) {
        const { messageId, clinicId, to, body, templateId } = job.data;
        this.logger.debug(`Processing SMS job: ${messageId} → ${to}`);
        try {
            const result = await this.smsProvider.send({
                to,
                body,
                templateId,
                clinicId,
            });
            const providerName = this.smsProvider.getProviderName(clinicId);
            if (result.success) {
                await Promise.all([
                    this.communicationService.updateMessageStatus(messageId, 'sent'),
                    this.communicationService.createLog({
                        message_id: messageId,
                        channel: 'sms',
                        provider: providerName,
                        provider_message_id: result.providerMessageId,
                        status: 'sent',
                        cost: result.cost,
                    }),
                ]);
                this.logger.debug(`SMS sent: ${messageId} → ${to}`);
            }
            else {
                await Promise.all([
                    this.communicationService.updateMessageStatus(messageId, 'failed'),
                    this.communicationService.createLog({
                        message_id: messageId,
                        channel: 'sms',
                        provider: providerName,
                        status: 'failed',
                        error_message: result.error,
                    }),
                ]);
                this.logger.warn(`SMS failed: ${messageId} → ${to}: ${result.error}`);
                throw new Error(result.error);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`SMS worker error: ${messageId}: ${message}`);
            const maxAttempts = (job.opts?.attempts ?? 3);
            if (job.attemptsMade >= maxAttempts - 1) {
                try {
                    await this.communicationService.handleChannelFallback(messageId, 'sms');
                }
                catch {
                }
            }
            throw error;
        }
    }
};
exports.SmsWorker = SmsWorker;
exports.SmsWorker = SmsWorker = SmsWorker_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_js_1.QUEUE_NAMES.COMMUNICATION_SMS),
    __metadata("design:paramtypes", [sms_provider_js_1.SmsProvider,
        communication_service_js_1.CommunicationService])
], SmsWorker);
//# sourceMappingURL=sms.worker.js.map