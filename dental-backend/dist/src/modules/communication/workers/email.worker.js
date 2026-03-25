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
var EmailWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const queue_names_js_1 = require("../../../common/queue/queue-names.js");
const email_provider_js_1 = require("../providers/email.provider.js");
const communication_service_js_1 = require("../communication.service.js");
let EmailWorker = EmailWorker_1 = class EmailWorker extends bullmq_1.WorkerHost {
    emailProvider;
    communicationService;
    logger = new common_1.Logger(EmailWorker_1.name);
    constructor(emailProvider, communicationService) {
        super();
        this.emailProvider = emailProvider;
        this.communicationService = communicationService;
    }
    async process(job) {
        const { messageId, clinicId, to, subject, body, html } = job.data;
        this.logger.debug(`Processing email job: ${messageId} → ${to}`);
        try {
            const result = await this.emailProvider.send({
                to,
                subject,
                body,
                html,
                clinicId,
            });
            const providerName = this.emailProvider.getProviderName(clinicId);
            if (result.success) {
                await Promise.all([
                    this.communicationService.updateMessageStatus(messageId, 'sent'),
                    this.communicationService.createLog({
                        message_id: messageId,
                        channel: 'email',
                        provider: providerName,
                        provider_message_id: result.providerMessageId,
                        status: 'sent',
                        cost: result.cost,
                    }),
                ]);
                this.logger.debug(`Email sent: ${messageId} → ${to}`);
            }
            else {
                await Promise.all([
                    this.communicationService.updateMessageStatus(messageId, 'failed'),
                    this.communicationService.createLog({
                        message_id: messageId,
                        channel: 'email',
                        provider: providerName,
                        status: 'failed',
                        error_message: result.error,
                    }),
                ]);
                this.logger.warn(`Email failed: ${messageId} → ${to}: ${result.error}`);
                throw new Error(result.error);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Email worker error: ${messageId}: ${message}`);
            const maxAttempts = (job.opts?.attempts ?? 3);
            if (job.attemptsMade >= maxAttempts - 1) {
                try {
                    await this.communicationService.handleChannelFallback(messageId, 'email');
                }
                catch {
                }
            }
            throw error;
        }
    }
};
exports.EmailWorker = EmailWorker;
exports.EmailWorker = EmailWorker = EmailWorker_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_js_1.QUEUE_NAMES.COMMUNICATION_EMAIL),
    __metadata("design:paramtypes", [email_provider_js_1.EmailProvider,
        communication_service_js_1.CommunicationService])
], EmailWorker);
//# sourceMappingURL=email.worker.js.map