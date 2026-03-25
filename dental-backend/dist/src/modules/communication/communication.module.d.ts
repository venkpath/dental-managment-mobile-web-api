import { type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
export declare class CommunicationModule implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
}
