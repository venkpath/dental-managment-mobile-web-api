"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapGoogleReviewToPublic = mapGoogleReviewToPublic;
exports.mapDirectoryReviewToPublic = mapDirectoryReviewToPublic;
exports.combineRatingStats = combineRatingStats;
exports.sortPublicReviews = sortPublicReviews;
exports.paginatePublicReviews = paginatePublicReviews;
exports.mergeListingReviewStats = mergeListingReviewStats;
function mapGoogleReviewToPublic(r) {
    return {
        id: r.id,
        reviewer_name: r.reviewer_name ?? 'Google User',
        overall_rating: r.rating,
        cleanliness_rating: null,
        staff_rating: null,
        wait_time_rating: null,
        value_rating: null,
        comment: r.comment,
        is_verified: true,
        source: 'google',
        created_at: r.review_created_at,
        doctor: null,
        reviewer_photo_url: r.reviewer_photo_url,
    };
}
function mapDirectoryReviewToPublic(r) {
    return { ...r, source: 'directory' };
}
function combineRatingStats(dirRatings, googleRatings) {
    const all = [...dirRatings, ...googleRatings];
    const distribution = all.reduce((acc, rating) => {
        acc[rating] = (acc[rating] ?? 0) + 1;
        return acc;
    }, {});
    return {
        count: all.length,
        avg: all.length
            ? Math.round((all.reduce((s, n) => s + n, 0) / all.length) * 10) / 10
            : null,
        distribution,
    };
}
function sortPublicReviews(reviews, sort) {
    const copy = [...reviews];
    if (sort === 'highest') {
        copy.sort((a, b) => b.overall_rating - a.overall_rating);
    }
    else if (sort === 'lowest') {
        copy.sort((a, b) => a.overall_rating - b.overall_rating);
    }
    else {
        copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return copy;
}
function paginatePublicReviews(items, page, limit) {
    const total = items.length;
    const skip = (page - 1) * limit;
    return {
        data: items.slice(skip, skip + limit),
        meta: { total, page, limit, total_pages: Math.max(1, Math.ceil(total / limit)) },
    };
}
function mergeListingReviewStats(dirRatings, googleCount, googleAvg) {
    const dirCount = dirRatings.length;
    const totalCount = dirCount + googleCount;
    if (totalCount === 0)
        return { review_count: 0, avg_rating: null };
    const dirSum = dirRatings.reduce((s, n) => s + n, 0);
    const googleSum = googleAvg != null ? googleAvg * googleCount : 0;
    return {
        review_count: totalCount,
        avg_rating: Math.round(((dirSum + googleSum) / totalCount) * 10) / 10,
    };
}
//# sourceMappingURL=directory-reviews-merge.utils.js.map