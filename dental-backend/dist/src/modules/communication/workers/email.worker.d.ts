import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { EmailProvider } from '../providers/email.provider.js';
import { CommunicationService } from '../communication.service.js';
import type { CommunicationJobData } from '../communication.producer.js';
export declare class EmailWorker extends WorkerHost {
    private readonly emailProvider;
    private readonly communicationService;
    private readonly logger;
    constructor(emailProvider: EmailProvider, communicationService: CommunicationService);
    process(job: Job<CommunicationJobData>): Promise<void>;
}
