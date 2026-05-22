export declare const WHATSAPP_OVERAGE_PRICE_INR: Readonly<Record<WhatsAppCategory, number>>;
export type WhatsAppCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
export declare function normalizeWhatsAppCategory(raw: string | null | undefined): WhatsAppCategory;
export declare function priceForCategory(category: WhatsAppCategory, count: number): number;
export declare function mapInternalCategoryToWa(internalCategory: string | null | undefined): WhatsAppCategory;
