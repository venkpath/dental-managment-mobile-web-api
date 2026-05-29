import { PrismaService } from '../../database/prisma.service.js';
import type { RegisterPushTokenDto } from './dto/register-push-token.dto.js';
export declare class PushDeviceService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    register(userId: string, dto: RegisterPushTokenDto): Promise<void>;
    unregister(userId: string, token: string): Promise<void>;
    unregisterAllForUser(userId: string): Promise<void>;
    getTokensForUser(userId: string): Promise<string[]>;
}
