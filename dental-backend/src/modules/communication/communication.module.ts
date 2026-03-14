import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { CommunicationController } from './communication.controller.js';
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

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.COMMUNICATION_EMAIL },
      { name: QUEUE_NAMES.COMMUNICATION_SMS },
      { name: QUEUE_NAMES.COMMUNICATION_WHATSAPP },
    ),
  ],
  controllers: [CommunicationController, TemplateController],
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
  exports: [CommunicationService, TemplateService, CommunicationProducer, TemplateRenderer],
})
export class CommunicationModule {}
