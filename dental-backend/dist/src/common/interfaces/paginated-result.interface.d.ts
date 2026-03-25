export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}
export interface PaginatedResult<T> {
    data: T[];
    meta: PaginationMeta;
}
export declare function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T>;
