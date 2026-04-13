import type { PrismaService } from '../../database/prisma.service.js';
export declare function seedDefaultTemplates(prisma: PrismaService): Promise<void>;
export declare function getWhatsAppSeedSampleValues(templateName: string): Record<string, string> | undefined;
export declare function getWhatsAppSeedMetaCategory(templateName: string): string;
