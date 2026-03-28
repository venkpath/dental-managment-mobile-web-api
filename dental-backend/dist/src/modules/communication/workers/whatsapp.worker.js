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
var WhatsAppWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const queue_names_js_1 = require("../../../common/queue/queue-names.js");
const whatsapp_provider_js_1 = require("../providers/whatsapp.provider.js");
const communication_service_js_1 = require("../communication.service.js");
let WhatsAppWorker = WhatsAppWorker_1 = class WhatsAppWorker extends bullmq_1.WorkerHost {
    whatsappProvider;
    communicationService;
    logger = new common_1.Logger(WhatsAppWorker_1.name);
    constructor(whatsappProvider, communicationService) {
        super();
        this.whatsappProvider = whatsappProvider;
        this.communicationService = communicationService;
    }
    async process(job) {
        const { messageId, clinicId, to, body, templateId, variables, language, mediaUrl, metadata } = job.data;
        this.logger.debug(`Processing WhatsApp job: ${messageId} → ${to} (template: ${templateId || 'none'}, vars: ${variables ? Object.keys(variables).length : 0}, lang: ${language || 'en'})`);
        try {
            const result = await this.whatsappProvider.send({
                to,
                body,
                templateId,
                variables,
                language,
                mediaUrl,
                clinicId,
                metadata,
            });
            const providerName = this.whatsappProvider.getProviderName(clinicId);
            if (result.success) {
                await Promise.all([
                    this.communicationService.updateMessageStatus(messageId, 'sent'),
                    this.communicationService.createLog({
                        message_id: messageId,
                        channel: 'whatsapp',
                        provider: providerName,
                        provider_message_id: result.providerMessageId,
                        status: 'sent',
                        cost: result.cost,
                    }),
                ]);
                this.logger.debug(`WhatsApp sent: ${messageId} → ${to}`);
            }
            else {
                await Promise.all([
                    this.communicationService.updateMessageStatus(messageId, 'failed'),
                    this.communicationService.createLog({
                        message_id: messageId,
                        channel: 'whatsapp',
                        provider: providerName,
                        status: 'failed',
                        error_message: result.error,
                    }),
                ]);
                this.logger.warn(`WhatsApp failed: ${messageId} → ${to}: ${result.error}`);
                throw new Error(result.error);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`WhatsApp worker error: ${messageId}: ${message}`);
            const maxAttempts = (job.opts?.attempts ?? 3);
            if (job.attemptsMade >= maxAttempts - 1) {
                try {
                    await this.communicationService.handleChannelFallback(messageId, 'whatsapp');
                }
                catch {
                }
            }
            throw error;
        }
    }
};
exports.WhatsAppWorker = WhatsAppWorker;
exports.WhatsAppWorker = WhatsAppWorker = WhatsAppWorker_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_js_1.QUEUE_NAMES.COMMUNICATION_WHATSAPP),
    __metadata("design:paramtypes", [whatsapp_provider_js_1.WhatsAppProvider,
        communication_service_js_1.CommunicationService])
], WhatsAppWorker);
//# sourceMappingURL=whatsapp.worker.js.map