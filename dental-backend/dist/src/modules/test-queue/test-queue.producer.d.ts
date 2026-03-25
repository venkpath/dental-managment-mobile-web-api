import { Queue } from 'bullmq';
export interface TestJobData {
    message: string;
    timestamp: string;
}
export declare class TestQueueProducer {
    private readonly testQueue;
    private readonly logger;
    constructor(testQueue: Queue);
    enqueue(message: string): Promise<{
        jobId: string | undefined;
    }>;
}
