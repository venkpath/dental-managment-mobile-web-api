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
var CommunicationModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_controller_js_1 = require("./communication.controller.js");
const communication_controller_js_2 = require("./communication.controller.js");
const communication_controller_js_3 = require("./communication.controller.js");
const template_controller_js_1 = require("./template.controller.js");
const communication_service_js_1 = require("./communication.service.js");
const template_service_js_1 = require("./template.service.js");
const template_renderer_js_1 = require("./template-renderer.js");
const communication_producer_js_1 = require("./communication.producer.js");
const email_worker_js_1 = require("./workers/email.worker.js");
const sms_worker_js_1 = require("./workers/sms.worker.js");
const whatsapp_worker_js_1 = require("./workers/whatsapp.worker.js");
const email_provider_js_1 = require("./providers/email.provider.js");
const sms_provider_js_1 = require("./providers/sms.provider.js");
const whatsapp_provider_js_1 = require("./providers/whatsapp.provider.js");
const seed_templates_js_1 = require("./seed-templates.js");
let CommunicationModule = CommunicationModule_1 = class CommunicationModule {
    prisma;
    logger = new common_1.Logger(CommunicationModule_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        try {
            await (0, seed_templates_js_1.seedDefaultTemplates)(this.prisma);
        }
        catch (error) {
            this.logger.error('Failed to seed default templates', error);
        }
    }
};
exports.CommunicationModule = CommunicationModule;
exports.CommunicationModule = CommunicationModule = CommunicationModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({ name: queue_names_js_1.QUEUE_NAMES.COMMUNICATION_EMAIL }, { name: queue_names_js_1.QUEUE_NAMES.COMMUNICATION_SMS }, { name: queue_names_js_1.QUEUE_NAMES.COMMUNICATION_WHATSAPP }),
        ],
        controllers: [communication_controller_js_1.CommunicationController, template_controller_js_1.TemplateController, communication_controller_js_2.OptOutController, communication_controller_js_3.WebhookController],
        providers: [
            communication_service_js_1.CommunicationService,
            template_service_js_1.TemplateService,
            template_renderer_js_1.TemplateRenderer,
            communication_producer_js_1.CommunicationProducer,
            email_provider_js_1.EmailProvider,
            sms_provider_js_1.SmsProvider,
            whatsapp_provider_js_1.WhatsAppProvider,
            email_worker_js_1.EmailWorker,
            sms_worker_js_1.SmsWorker,
            whatsapp_worker_js_1.WhatsAppWorker,
        ],
        exports: [communication_service_js_1.CommunicationService, template_service_js_1.TemplateService, communication_producer_js_1.CommunicationProducer, template_renderer_js_1.TemplateRenderer, sms_provider_js_1.SmsProvider, email_provider_js_1.EmailProvider],
    }),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], CommunicationModule);
//# sourceMappingURL=communication.module.js.map