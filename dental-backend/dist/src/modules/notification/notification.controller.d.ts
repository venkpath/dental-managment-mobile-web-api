import { NotificationService } from './notification.service.js';
import { NotificationCronService } from './notification.cron.js';
import { QueryNotificationDto } from './dto/index.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
export declare class NotificationController {
    private readonly notificationService;
    private readonly cronService;
    constructor(notificationService: NotificationService, cronService: NotificationCronService);
    triggerCrons(): Promise<{
        message: string;
        results: Record<string, string>;
    }>;
    triggerSingleCron(jobName: string): Promise<{
        job: string;
        status: string;
        error?: undefined;
    } | {
        job: string;
        status: string;
        error: string;
    }>;
    findAll(clinicId: string, user: JwtPayload, query: QueryNotificationDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        id: string;
        created_at: Date;
        clinic_id: string;
        body: string;
        type: string;
        title: string;
        user_id: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        is_read: boolean;
    }>>;
    unreadCount(clinicId: string, user: JwtPayload): Promise<{
        count: number;
    }>;
    markAllRead(clinicId: string, user: JwtPayload): Promise<{
        count: number;
    }>;
    markRead(clinicId: string, id: string): Promise<{
        id: string;
        created_at: Date;
        clinic_id: string;
        body: string;
        type: string;
        title: string;
        user_id: string | null;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        is_read: boolean;
    }>;
}
