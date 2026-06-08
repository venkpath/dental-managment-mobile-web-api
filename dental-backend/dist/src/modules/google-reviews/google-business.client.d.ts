import { ConfigService } from '@nestjs/config';
export interface GoogleAccount {
    name: string;
    accountId: string;
    displayName: string;
    type: string;
}
export interface GoogleLocation {
    name: string;
    locationId: string;
    title: string;
    address?: string;
}
export interface GoogleReviewItem {
    reviewId: string;
    reviewerName?: string;
    reviewerPhotoUrl?: string;
    rating: number;
    comment?: string;
    createTime: Date;
    updateTime: Date;
    hasOwnerReply: boolean;
    ownerReplyComment?: string;
}
export interface OAuthTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
}
export declare class GoogleBusinessClient {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    private get clientId();
    private get clientSecret();
    private get redirectUri();
    private get stateSecret();
    signState(clinicId: string): string;
    verifyState(state: string): string;
    buildAuthUrl(clinicId: string): string;
    exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse>;
    refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse>;
    revokeToken(token: string): Promise<void>;
    listAccounts(accessToken: string): Promise<GoogleAccount[]>;
    listLocations(accessToken: string, accountResourceName: string): Promise<GoogleLocation[]>;
    listReviews(accessToken: string, accountId: string, locationId: string, options?: {
        pageToken?: string;
        pageSize?: number;
    }): Promise<{
        reviews: GoogleReviewItem[];
        nextPageToken?: string;
        totalReviewCount?: number;
    }>;
    replyToReview(accessToken: string, accountId: string, locationId: string, reviewId: string, comment: string): Promise<{
        comment: string;
        updateTime: string;
    }>;
    private callJson;
    private extractErrorMessage;
    static intToStarRating(rating: number): string;
}
