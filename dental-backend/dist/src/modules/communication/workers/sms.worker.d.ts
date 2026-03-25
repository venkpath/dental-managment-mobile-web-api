import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { SmsProvider } from '../providers/sms.provider.js';
import { CommunicationService } from '../communication.service.js';
import type { CommunicationJobData } from '../communication.producer.js';
export declare class SmsWorker extends WorkerHost {
    private readonly smsProvider;
    private readonly communicationService;
    private readonly logger;
    constructor(smsProvider: SmsProvider, communicationService: CommunicationService);
    process(job: Job<CommunicationJobData>): Promise<void>;
}
