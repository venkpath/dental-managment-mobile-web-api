export interface PublicReviewDto {
    id: string;
    reviewer_name: string;
    overall_rating: number;
    cleanliness_rating: number | null;
    staff_rating: number | null;
    wait_time_rating: number | null;
    value_rating: number | null;
    comment: string | null;
    is_verified: boolean;
    source: 'directory' | 'google';
    created_at: Date;
    doctor: {
        name: string;
    } | null;
    reviewer_photo_url?: string | null;
}
export interface DirectoryReviewRow {
    id: string;
    reviewer_name: string;
    overall_rating: number;
    cleanliness_rating: number | null;
    staff_rating: number | null;
    wait_time_rating: number | null;
    value_rating: number | null;
    comment: string | null;
    is_verified: boolean;
    created_at: Date;
    doctor: {
        name: string;
    } | null;
}
export interface GoogleReviewRow {
    id: string;
    reviewer_name: string | null;
    reviewer_photo_url: string | null;
    rating: number;
    comment: string | null;
    review_created_at: Date;
}
export declare function mapGoogleReviewToPublic(r: GoogleReviewRow): PublicReviewDto;
export declare function mapDirectoryReviewToPublic(r: DirectoryReviewRow): PublicReviewDto;
export declare function combineRatingStats(dirRatings: number[], googleRatings: number[]): {
    count: number;
    avg: number | null;
    distribution: Record<number, number>;
};
export declare function sortPublicReviews(reviews: PublicReviewDto[], sort: 'recent' | 'highest' | 'lowest'): PublicReviewDto[];
export declare function paginatePublicReviews<T>(items: T[], page: number, limit: number): {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
};
export declare function mergeListingReviewStats(dirRatings: number[], googleCount: number, googleAvg: number | null): {
    review_count: number;
    avg_rating: number | null;
};
