import { TestQueueProducer } from './test-queue.producer.js';
declare class EnqueueTestJobDto {
    message?: string;
}
export declare class TestQueueController {
    private readonly testQueueProducer;
    constructor(testQueueProducer: TestQueueProducer);
    enqueueJob(body: EnqueueTestJobDto): Promise<{
        jobId: string | undefined;
    }>;
}
export {};
