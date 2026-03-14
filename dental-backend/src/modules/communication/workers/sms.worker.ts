import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/queue/queue-names.js';
import { SmsProvider } from '../providers/sms.provider.js';
import { CommunicationService } from '../communication.service.js';
import type { CommunicationJobData } from '../communication.producer.js';

@Processor(QUEUE_NAMES.COMMUNICATION_SMS)
export class SmsWorker extends WorkerHost {
  private readonly logger = new Logger(SmsWorker.name);

  constructor(
    private readonly smsProvider: SmsProvider,
    private readonly communicationService: CommunicationService,
  ) {
    super();
  }

  async process(job: Job<CommunicationJobData>): Promise<void> {
    const { messageId, clinicId, to, body, templateId } = job.data;

    this.logger.debug(`Processing SMS job: ${messageId} → ${to}`);

    try {
      const result = await this.smsProvider.send({
        to,
        body,
        templateId, // DLT template ID
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
      } else {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMS worker error: ${messageId}: ${message}`);
      throw error;
    }
  }
}
