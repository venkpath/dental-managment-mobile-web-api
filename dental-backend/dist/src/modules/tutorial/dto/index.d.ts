declare const ROLES: string[];
export type AllowedRole = (typeof ROLES)[number];
export declare class CreateTutorialDto {
    title: string;
    description?: string;
    s3_key: string;
    thumbnail_s3_key?: string;
    duration_seconds?: number;
    category?: string;
    display_order?: number;
    allowed_roles: string[];
    is_published?: boolean;
}
export declare class UpdateTutorialDto {
    title?: string;
    description?: string;
    s3_key?: string;
    thumbnail_s3_key?: string;
    duration_seconds?: number;
    category?: string;
    display_order?: number;
    allowed_roles?: string[];
    is_published?: boolean;
}
export declare class UpdateProgressDto {
    last_position_seconds: number;
    completed?: boolean;
}
export {};
