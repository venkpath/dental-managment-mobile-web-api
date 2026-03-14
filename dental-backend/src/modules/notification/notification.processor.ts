import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { NotificationService, CreateNotificationInput } from './notification.service.js';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<CreateNotificationInput>): Promise<void> {
    try {
      await this.notificationService.create(job.data);
      this.logger.debug(`Notification created: ${job.data.type} for user ${job.data.user_id ?? 'broadcast'}`);
    } catch (error) {
      this.logger.error(`Failed to process notification job ${job.id}: ${error}`);
      throw error;
    }
  }
}
