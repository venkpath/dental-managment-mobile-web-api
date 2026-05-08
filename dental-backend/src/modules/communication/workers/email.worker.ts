import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/queue/queue-names.js';
import { EmailProvider } from '../providers/email.provider.js';
import { CommunicationService } from '../communication.service.js';
import type { CommunicationJobData } from '../communication.producer.js';

@Processor(QUEUE_NAMES.COMMUNICATION_EMAIL)
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly communicationService: CommunicationService,
  ) {
    super();
  }

  async process(job: Job<CommunicationJobData>): Promise<void> {
    const { messageId, clinicId, to, subject, body, html } = job.data;

    this.logger.debug(`Processing email job: ${messageId} → ${to}`);

    // Reload provider config from DB if the server restarted and the in-memory map is empty.
    await this.communicationService.ensureClinicProviders(clinicId);

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
      } else {
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
        throw new Error(result.error); // trigger retry
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Email worker error: ${messageId}: ${message}`);

      // On final attempt, try channel fallback
      const maxAttempts = (job.opts?.attempts ?? 3);
      if (job.attemptsMade >= maxAttempts - 1) {
        try {
          await this.communicationService.handleChannelFallback(messageId, 'email');
        } catch {
          // Fallback failed — nothing more to do
        }
      }

      throw error;
    }
  }
}
