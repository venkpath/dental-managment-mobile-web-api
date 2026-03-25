import { PrismaService } from '../../database/prisma.service.js';
import { CreateFeatureDto } from './dto/index.js';
import { Feature } from '@prisma/client';
export declare class FeatureService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateFeatureDto): Promise<Feature>;
    findAll(): Promise<Feature[]>;
    remove(id: string): Promise<Feature>;
}
