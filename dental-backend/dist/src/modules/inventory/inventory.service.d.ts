import { PrismaService } from '../../database/prisma.service.js';
import { CreateInventoryItemDto, UpdateInventoryItemDto, QueryInventoryItemDto } from './dto/index.js';
import { InventoryItem } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
export declare class InventoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(clinicId: string, dto: CreateInventoryItemDto): Promise<InventoryItem>;
    findAll(clinicId: string, query: QueryInventoryItemDto): Promise<PaginatedResult<InventoryItem>>;
    findOne(clinicId: string, id: string): Promise<InventoryItem>;
    update(clinicId: string, id: string, dto: UpdateInventoryItemDto): Promise<InventoryItem>;
}
