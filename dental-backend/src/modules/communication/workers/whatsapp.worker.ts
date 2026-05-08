import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/queue/queue-names.js';
import { WhatsAppProvider } from '../providers/whatsapp.provider.js';
import { CommunicationService } from '../communication.service.js';
import type { CommunicationJobData } from '../communication.producer.js';

@Processor(QUEUE_NAMES.COMMUNICATION_WHATSAPP)
export class WhatsAppWorker extends WorkerHost {
  private readonly logger = new Logger(WhatsAppWorker.name);

  constructor(
    private readonly whatsappProvider: WhatsAppProvider,
    private readonly communicationService: CommunicationService,
  ) {
    super();
  }

  async process(job: Job<CommunicationJobData>): Promise<void> {
    const { messageId, clinicId, to, body, templateId, variables, language, mediaUrl, metadata } = job.data;

    this.logger.debug(`Processing WhatsApp job: ${messageId} → ${to} (template: ${templateId || 'none'}, vars: ${variables ? Object.keys(variables).length : 0}, lang: ${language || 'en'})`);

    // Reload provider config from DB if the server restarted and the in-memory map is empty.
    await this.communicationService.ensureClinicProviders(clinicId);

    try {
      const result = await this.whatsappProvider.send({
        to,
        body,
        templateId, // Meta-approved WhatsApp template name
        variables,  // Template variables for Meta components
        language,   // Template language code
        mediaUrl,
        clinicId,
        metadata,   // Carries button params, etc.
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
      } else {
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
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`WhatsApp worker error: ${messageId}: ${message}`);

      // On final attempt, try channel fallback
      const maxAttempts = (job.opts?.attempts ?? 3);
      if (job.attemptsMade >= maxAttempts - 1) {
        try {
          await this.communicationService.handleChannelFallback(messageId, 'whatsapp');
        } catch {
          // Fallback failed — nothing more to do
        }
      }

      throw error;
    }
  }
}
