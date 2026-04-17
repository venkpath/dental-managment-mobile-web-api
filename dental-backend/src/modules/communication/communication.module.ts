import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationController } from './communication.controller.js';
import { OptOutController } from './communication.controller.js';
import { WebhookController } from './communication.controller.js';
import { TemplateController } from './template.controller.js';
import { CommunicationService } from './communication.service.js';
import { TemplateService } from './template.service.js';
import { TemplateRenderer } from './template-renderer.js';
import { CommunicationProducer } from './communication.producer.js';
import { EmailWorker } from './workers/email.worker.js';
import { SmsWorker } from './workers/sms.worker.js';
import { WhatsAppWorker } from './workers/whatsapp.worker.js';
import { EmailProvider } from './providers/email.provider.js';
import { SmsProvider } from './providers/sms.provider.js';
import { WhatsAppProvider } from './providers/whatsapp.provider.js';
import { seedDefaultTemplates } from './seed-templates.js';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.COMMUNICATION_EMAIL },
      { name: QUEUE_NAMES.COMMUNICATION_SMS },
      { name: QUEUE_NAMES.COMMUNICATION_WHATSAPP },
    ),
  ],
  controllers: [CommunicationController, TemplateController, OptOutController, WebhookController],
  providers: [
    CommunicationService,
    TemplateService,
    TemplateRenderer,
    CommunicationProducer,
    // Channel providers (disabled by default — configured via clinic settings)
    EmailProvider,
    SmsProvider,
    WhatsAppProvider,
    // Queue workers
    EmailWorker,
    SmsWorker,
    WhatsAppWorker,
  ],
  exports: [CommunicationService, TemplateService, CommunicationProducer, TemplateRenderer, SmsProvider, EmailProvider, WhatsAppProvider],
})
export class CommunicationModule implements OnModuleInit {
  private readonly logger = new Logger(CommunicationModule.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await seedDefaultTemplates(this.prisma);
    } catch (error) {
      this.logger.error('Failed to seed default templates', error);
    }
  }
}
