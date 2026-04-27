import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const ACCOUNT_MGMT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const MY_BUSINESS_V4 = 'https://mybusiness.googleapis.com/v4';

const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/business.manage';

const STAR_RATING_TO_INT: Record<string, number> = {
  STAR_RATING_UNSPECIFIED: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

const INT_TO_STAR_RATING: Record<number, string> = {
  1: 'ONE',
  2: 'TWO',
  3: 'THREE',
  4: 'FOUR',
  5: 'FIVE',
};

export interface GoogleAccount {
  /** Resource id like "accounts/123456789" */
  name: string;
  /** Numeric id extracted from `name` */
  accountId: string;
  /** Display name */
  displayName: string;
  /** PERSONAL | LOCATION_GROUP | ORGANIZATION */
  type: string;
}

export interface GoogleLocation {
  /** Resource id like "locations/987654321" (or full path) */
  name: string;
  locationId: string;
  title: string;
  /** Concatenated address for display */
  address?: string;
}

export interface GoogleReviewItem {
  /** Last segment of `reviews/<id>` */
  reviewId: string;
  reviewerName?: string;
  reviewerPhotoUrl?: string;
  rating: number; // 1-5 (0 if unspecified)
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

/**
 * GoogleBusinessClient
 *
 * Thin wrapper over the Google Business Profile API. Each method takes the
 * caller's access token (refreshed as needed by GoogleReviewsService).
 *
 * NOTE: The Google Business Profile API requires manual approval from Google
 * before it returns real data. Until that approval lands, calls will return
 * 403 / "API has not been used in project". The OAuth flow itself works
 * regardless — clinics can connect and we'll start polling once approved.
 */
@Injectable()
export class GoogleBusinessClient {
  private readonly logger = new Logger(GoogleBusinessClient.name);

  constructor(private readonly config: ConfigService) {}

  // ─── OAuth ────────────────────────────────────────────────────

  private get clientId(): string {
    const id = this.config.get<string>('app.google.clientId');
    if (!id) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_ID is not configured on the server.');
    }
    return id;
  }

  private get clientSecret(): string {
    const secret = this.config.get<string>('app.google.clientSecret');
    if (!secret) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_SECRET is not configured on the server.');
    }
    return secret;
  }

  private get redirectUri(): string {
    return this.config.get<string>('app.google.redirectUri') || 'http://localhost:3000/api/google-reviews/oauth/callback';
  }

  /** State token signing key. Falls back to JWT secret. */
  private get stateSecret(): string {
    return this.config.get<string>('app.jwtSecret') || 'change-me';
  }

  /** Build a signed `state` value carrying the clinic id through the OAuth round-trip. */
  signState(clinicId: string): string {
    const payload = `${clinicId}.${Date.now()}.${crypto.randomBytes(8).toString('hex')}`;
    const sig = crypto.createHmac('sha256', this.stateSecret).update(payload).digest('hex');
    return Buffer.from(`${payload}.${sig}`).toString('base64url');
  }

  /** Verify a state value and return the clinic id, or throw. */
  verifyState(state: string): string {
    let decoded: string;
    try {
      decoded = Buffer.from(state, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }
    const parts = decoded.split('.');
    if (parts.length !== 4) throw new BadRequestException('Invalid OAuth state');
    const [clinicId, ts, nonce, sig] = parts;
    const expected = crypto
      .createHmac('sha256', this.stateSecret)
      .update(`${clinicId}.${ts}.${nonce}`)
      .digest('hex');
    if (sig !== expected) throw new BadRequestException('OAuth state signature mismatch');
    // 30-minute window for the consent screen
    const age = Date.now() - Number(ts);
    if (!Number.isFinite(age) || age > 30 * 60 * 1000) {
      throw new BadRequestException('OAuth state has expired — please reconnect');
    }
    return clinicId!;
  }

  buildAuthUrl(clinicId: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: REQUIRED_SCOPE,
      access_type: 'offline',
      prompt: 'consent', // force refresh_token issuance even on re-consent
      include_granted_scopes: 'true',
      state: this.signState(clinicId),
    });
    return `${OAUTH_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });
    const res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const err = (json['error_description'] || json['error'] || 'token exchange failed') as string;
      throw new BadRequestException(`Google OAuth failed: ${err}`);
    }
    return json as unknown as OAuthTokenResponse;
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
    });
    const res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const err = (json['error_description'] || json['error'] || 'token refresh failed') as string;
      throw new BadRequestException(`Google token refresh failed: ${err}`);
    }
    return json as unknown as OAuthTokenResponse;
  }

  async revokeToken(token: string): Promise<void> {
    try {
      await fetch(`${OAUTH_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (err) {
      this.logger.warn(`Token revoke failed: ${(err as Error).message}`);
    }
  }

  // ─── Accounts + locations ─────────────────────────────────────

  async listAccounts(accessToken: string): Promise<GoogleAccount[]> {
    const data = await this.callJson<Record<string, unknown>>(
      `${ACCOUNT_MGMT_API}/accounts`,
      accessToken,
    );
    const accounts = (data['accounts'] as Array<Record<string, unknown>> | undefined) || [];
    return accounts.map((a) => {
      const name = (a['name'] as string) || '';
      return {
        name,
        accountId: name.replace(/^accounts\//, ''),
        displayName: (a['accountName'] as string) || name,
        type: (a['type'] as string) || 'PERSONAL',
      };
    });
  }

  async listLocations(accessToken: string, accountResourceName: string): Promise<GoogleLocation[]> {
    // Business Information API requires an explicit `readMask`
    const params = new URLSearchParams({
      readMask: 'name,title,storefrontAddress',
      pageSize: '100',
    });
    const data = await this.callJson<Record<string, unknown>>(
      `${BUSINESS_INFO_API}/${accountResourceName}/locations?${params.toString()}`,
      accessToken,
    );
    const locations = (data['locations'] as Array<Record<string, unknown>> | undefined) || [];
    return locations.map((loc) => {
      const fullName = (loc['name'] as string) || ''; // "locations/12345"
      const id = fullName.replace(/^locations\//, '');
      const addr = loc['storefrontAddress'] as Record<string, unknown> | undefined;
      const lines = (addr?.['addressLines'] as string[] | undefined) || [];
      const locality = (addr?.['locality'] as string) || '';
      const addressStr = [...lines, locality].filter(Boolean).join(', ');
      return {
        name: fullName,
        locationId: id,
        title: (loc['title'] as string) || fullName,
        address: addressStr || undefined,
      };
    });
  }

  // ─── Reviews ───────────────────────────────────────────────────

  async listReviews(
    accessToken: string,
    accountId: string,
    locationId: string,
    options: { pageToken?: string; pageSize?: number } = {},
  ): Promise<{ reviews: GoogleReviewItem[]; nextPageToken?: string; totalReviewCount?: number }> {
    const params = new URLSearchParams();
    params.set('pageSize', String(options.pageSize ?? 50));
    if (options.pageToken) params.set('pageToken', options.pageToken);

    const data = await this.callJson<Record<string, unknown>>(
      `${MY_BUSINESS_V4}/accounts/${accountId}/locations/${locationId}/reviews?${params.toString()}`,
      accessToken,
    );

    const raw = (data['reviews'] as Array<Record<string, unknown>> | undefined) || [];
    const reviews: GoogleReviewItem[] = raw.map((r) => {
      const reviewName = (r['reviewId'] as string) || (r['name'] as string) || '';
      const reviewer = r['reviewer'] as Record<string, unknown> | undefined;
      const reviewReply = r['reviewReply'] as Record<string, unknown> | undefined;
      const ratingStr = (r['starRating'] as string) || 'STAR_RATING_UNSPECIFIED';
      return {
        reviewId: reviewName.replace(/^.*\/reviews\//, '').replace(/^reviews\//, ''),
        reviewerName: reviewer?.['displayName'] as string | undefined,
        reviewerPhotoUrl: reviewer?.['profilePhotoUrl'] as string | undefined,
        rating: STAR_RATING_TO_INT[ratingStr] ?? 0,
        comment: r['comment'] as string | undefined,
        createTime: new Date((r['createTime'] as string) || Date.now()),
        updateTime: new Date((r['updateTime'] as string) || (r['createTime'] as string) || Date.now()),
        hasOwnerReply: !!reviewReply,
        ownerReplyComment: reviewReply?.['comment'] as string | undefined,
      };
    });

    return {
      reviews,
      nextPageToken: data['nextPageToken'] as string | undefined,
      totalReviewCount: data['totalReviewCount'] as number | undefined,
    };
  }

  async replyToReview(
    accessToken: string,
    accountId: string,
    locationId: string,
    reviewId: string,
    comment: string,
  ): Promise<{ comment: string; updateTime: string }> {
    const url = `${MY_BUSINESS_V4}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const errMsg = this.extractErrorMessage(data);
      throw new BadRequestException(`Failed to post reply: ${errMsg}`);
    }
    return {
      comment: (data['comment'] as string) || comment,
      updateTime: (data['updateTime'] as string) || new Date().toISOString(),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async callJson<T>(url: string, accessToken: string): Promise<T> {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const errMsg = this.extractErrorMessage(data);
      throw new BadRequestException(`Google API error: ${errMsg}`);
    }
    return data as T;
  }

  private extractErrorMessage(data: Record<string, unknown>): string {
    const error = data['error'] as Record<string, unknown> | undefined;
    if (!error) return 'unknown error';
    return (error['message'] as string) || (error['status'] as string) || 'unknown error';
  }

  /** Convenience helper for tests / future star-int → enum mapping */
  static intToStarRating(rating: number): string {
    return INT_TO_STAR_RATING[rating] || 'STAR_RATING_UNSPECIFIED';
  }
}
