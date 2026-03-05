import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { TestJobData } from './test-queue.producer.js';

@Processor(QUEUE_NAMES.TEST)
export class TestQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(TestQueueProcessor.name);

  async process(job: Job<TestJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id}: ${job.data.message}`);
    this.logger.log(`Job enqueued at: ${job.data.timestamp}`);
    this.logger.log(`Job ${job.id} completed successfully`);
  }
}
