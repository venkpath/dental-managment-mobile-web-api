import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

export interface TestJobData {
  message: string;
  timestamp: string;
}

@Injectable()
export class TestQueueProducer {
  private readonly logger = new Logger(TestQueueProducer.name);

  constructor(@InjectQueue(QUEUE_NAMES.TEST) private readonly testQueue: Queue) {}

  async enqueue(message: string): Promise<{ jobId: string | undefined }> {
    const job = await this.testQueue.add('test-job', {
      message,
      timestamp: new Date().toISOString(),
    } satisfies TestJobData);

    this.logger.log(`Job enqueued with ID: ${job.id}`);
    return { jobId: job.id };
  }
}
