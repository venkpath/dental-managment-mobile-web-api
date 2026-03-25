import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { WhatsAppProvider } from '../providers/whatsapp.provider.js';
import { CommunicationService } from '../communication.service.js';
import type { CommunicationJobData } from '../communication.producer.js';
export declare class WhatsAppWorker extends WorkerHost {
    private readonly whatsappProvider;
    private readonly communicationService;
    private readonly logger;
    constructor(whatsappProvider: WhatsAppProvider, communicationService: CommunicationService);
    process(job: Job<CommunicationJobData>): Promise<void>;
}
