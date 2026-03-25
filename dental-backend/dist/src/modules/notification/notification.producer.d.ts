import { Queue } from 'bullmq';
import { CreateNotificationInput } from './notification.service.js';
export declare class NotificationProducer {
    private readonly queue;
    constructor(queue: Queue);
    enqueue(input: CreateNotificationInput): Promise<void>;
    enqueueMany(inputs: CreateNotificationInput[]): Promise<void>;
}
