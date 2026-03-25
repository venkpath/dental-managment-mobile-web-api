import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService, CreateNotificationInput } from './notification.service.js';
export declare class NotificationProcessor extends WorkerHost {
    private readonly notificationService;
    private readonly logger;
    constructor(notificationService: NotificationService);
    process(job: Job<CreateNotificationInput>): Promise<void>;
}
