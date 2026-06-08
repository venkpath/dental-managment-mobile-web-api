/** Shared shape returned by public directory review endpoints. */
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
  doctor: { name: string } | null;
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
  doctor: { name: string } | null;
}

export interface GoogleReviewRow {
  id: string;
  reviewer_name: string | null;
  reviewer_photo_url: string | null;
  rating: number;
  comment: string | null;
  review_created_at: Date;
}

export function mapGoogleReviewToPublic(r: GoogleReviewRow): PublicReviewDto {
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

export function mapDirectoryReviewToPublic(r: DirectoryReviewRow): PublicReviewDto {
  return { ...r, source: 'directory' };
}

export function combineRatingStats(dirRatings: number[], googleRatings: number[]) {
  const all = [...dirRatings, ...googleRatings];
  const distribution = all.reduce(
    (acc, rating) => {
      acc[rating] = (acc[rating] ?? 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );
  return {
    count: all.length,
    avg: all.length
      ? Math.round((all.reduce((s, n) => s + n, 0) / all.length) * 10) / 10
      : null,
    distribution,
  };
}

export function sortPublicReviews(
  reviews: PublicReviewDto[],
  sort: 'recent' | 'highest' | 'lowest',
): PublicReviewDto[] {
  const copy = [...reviews];
  if (sort === 'highest') {
    copy.sort((a, b) => b.overall_rating - a.overall_rating);
  } else if (sort === 'lowest') {
    copy.sort((a, b) => a.overall_rating - b.overall_rating);
  } else {
    copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  return copy;
}

export function paginatePublicReviews<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const skip = (page - 1) * limit;
  return {
    data: items.slice(skip, skip + limit),
    meta: { total, page, limit, total_pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/** Merge directory + Google rating arrays into count + average for listing cards. */
export function mergeListingReviewStats(
  dirRatings: number[],
  googleCount: number,
  googleAvg: number | null,
): { review_count: number; avg_rating: number | null } {
  const dirCount = dirRatings.length;
  const totalCount = dirCount + googleCount;
  if (totalCount === 0) return { review_count: 0, avg_rating: null };

  const dirSum = dirRatings.reduce((s, n) => s + n, 0);
  const googleSum = googleAvg != null ? googleAvg * googleCount : 0;
  return {
    review_count: totalCount,
    avg_rating: Math.round(((dirSum + googleSum) / totalCount) * 10) / 10,
  };
}
