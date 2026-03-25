import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TestJobData } from './test-queue.producer.js';
export declare class TestQueueProcessor extends WorkerHost {
    private readonly logger;
    process(job: Job<TestJobData>): Promise<void>;
}
