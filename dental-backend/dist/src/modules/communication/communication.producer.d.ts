import type { Queue } from 'bullmq';
export interface CommunicationJobData {
    messageId: string;
    clinicId: string;
    channel: string;
    to: string;
    subject?: string;
    body: string;
    html?: string;
    templateId?: string;
    variables?: Record<string, string>;
    language?: string;
    mediaUrl?: string;
    metadata?: Record<string, unknown>;
    scheduledAt?: string;
}
export declare class CommunicationProducer {
    private readonly emailQueue;
    private readonly smsQueue;
    private readonly whatsappQueue;
    private readonly logger;
    constructor(emailQueue: Queue, smsQueue: Queue, whatsappQueue: Queue);
    enqueue(job: CommunicationJobData, options?: {
        attempts?: number;
    }): Promise<void>;
    enqueueBulk(jobs: CommunicationJobData[]): Promise<void>;
    private getQueue;
}
