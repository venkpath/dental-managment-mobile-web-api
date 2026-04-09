export declare class CreateInventoryItemDto {
    branch_id: string;
    name: string;
    category?: string;
    quantity: number;
    unit: string;
    reorder_level?: number;
    supplier?: string;
    purchase_unit?: string;
    purchase_price?: number;
    pack_unit?: string;
    packs_per_purchase?: number;
    units_per_pack?: number;
    units_in_purchase?: number;
    cost_price?: number;
    selling_price?: number;
    markup_percent?: number;
    expiry_date?: Date;
    batch_number?: string;
    location?: string;
    notes?: string;
}
