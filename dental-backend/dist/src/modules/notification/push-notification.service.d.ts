import { PushDeviceService } from './push-device.service.js';
export interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    channelId?: string;
}
export declare class PushNotificationService {
    private readonly pushDeviceService;
    private readonly logger;
    constructor(pushDeviceService: PushDeviceService);
    sendToUser(userId: string, payload: PushPayload): Promise<void>;
    sendToUsers(userIds: string[], payload: PushPayload): Promise<void>;
}
