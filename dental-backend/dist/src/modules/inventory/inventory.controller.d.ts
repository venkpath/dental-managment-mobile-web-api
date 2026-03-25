import { InventoryService } from './inventory.service.js';
import { CreateInventoryItemDto, UpdateInventoryItemDto, QueryInventoryItemDto } from './dto/index.js';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    create(clinicId: string, dto: CreateInventoryItemDto): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        category: string | null;
        quantity: number;
        unit: string;
        reorder_level: number;
        supplier: string | null;
    }>;
    findAll(clinicId: string, query: QueryInventoryItemDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        category: string | null;
        quantity: number;
        unit: string;
        reorder_level: number;
        supplier: string | null;
    }>>;
    findOne(clinicId: string, id: string): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        category: string | null;
        quantity: number;
        unit: string;
        reorder_level: number;
        supplier: string | null;
    }>;
    update(clinicId: string, id: string, dto: UpdateInventoryItemDto): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string;
        category: string | null;
        quantity: number;
        unit: string;
        reorder_level: number;
        supplier: string | null;
    }>;
}
