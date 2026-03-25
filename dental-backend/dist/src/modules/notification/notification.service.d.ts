import { PrismaService } from '../../database/prisma.service.js';
import { Notification } from '@prisma/client';
import { QueryNotificationDto } from './dto/index.js';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
export interface CreateNotificationInput {
    clinic_id: string;
    user_id?: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
}
export declare class NotificationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateNotificationInput): Promise<Notification>;
    createMany(inputs: CreateNotificationInput[]): Promise<number>;
    findByClinicAndUser(clinicId: string, userId: string, query: QueryNotificationDto): Promise<PaginatedResult<Notification>>;
    getUnreadCount(clinicId: string, userId: string): Promise<number>;
    markAsRead(clinicId: string, id: string): Promise<Notification>;
    markAllAsRead(clinicId: string, userId: string): Promise<number>;
}
