"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GoogleBusinessClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleBusinessClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const ACCOUNT_MGMT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const MY_BUSINESS_V4 = 'https://mybusiness.googleapis.com/v4';
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/business.manage';
const STAR_RATING_TO_INT = {
    STAR_RATING_UNSPECIFIED: 0,
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
};
const INT_TO_STAR_RATING = {
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
    5: 'FIVE',
};
let GoogleBusinessClient = GoogleBusinessClient_1 = class GoogleBusinessClient {
    config;
    logger = new common_1.Logger(GoogleBusinessClient_1.name);
    constructor(config) {
        this.config = config;
    }
    get clientId() {
        const id = this.config.get('app.google.clientId');
        if (!id) {
            throw new common_1.InternalServerErrorException('GOOGLE_CLIENT_ID is not configured on the server.');
        }
        return id;
    }
    get clientSecret() {
        const secret = this.config.get('app.google.clientSecret');
        if (!secret) {
            throw new common_1.InternalServerErrorException('GOOGLE_CLIENT_SECRET is not configured on the server.');
        }
        return secret;
    }
    get redirectUri() {
        return (this.config.get('app.google.redirectUri') ||
            'http://localhost:3000/api/v1/google-reviews/oauth/callback');
    }
    get stateSecret() {
        return this.config.get('app.jwtSecret') || 'change-me';
    }
    signState(clinicId) {
        const payload = `${clinicId}.${Date.now()}.${crypto.randomBytes(8).toString('hex')}`;
        const sig = crypto.createHmac('sha256', this.stateSecret).update(payload).digest('hex');
        return Buffer.from(`${payload}.${sig}`).toString('base64url');
    }
    verifyState(state) {
        let decoded;
        try {
            decoded = Buffer.from(state, 'base64url').toString('utf8');
        }
        catch {
            throw new common_1.BadRequestException('Invalid OAuth state');
        }
        const parts = decoded.split('.');
        if (parts.length !== 4)
            throw new common_1.BadRequestException('Invalid OAuth state');
        const [clinicId, ts, nonce, sig] = parts;
        const expected = crypto
            .createHmac('sha256', this.stateSecret)
            .update(`${clinicId}.${ts}.${nonce}`)
            .digest('hex');
        if (sig !== expected)
            throw new common_1.BadRequestException('OAuth state signature mismatch');
        const age = Date.now() - Number(ts);
        if (!Number.isFinite(age) || age > 30 * 60 * 1000) {
            throw new common_1.BadRequestException('OAuth state has expired — please reconnect');
        }
        return clinicId;
    }
    buildAuthUrl(clinicId) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: REQUIRED_SCOPE,
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
            state: this.signState(clinicId),
        });
        return `${OAUTH_AUTH_URL}?${params.toString()}`;
    }
    async exchangeCodeForTokens(code) {
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
        const json = (await res.json());
        if (!res.ok) {
            const err = (json['error_description'] || json['error'] || 'token exchange failed');
            throw new common_1.BadRequestException(`Google OAuth failed: ${err}`);
        }
        return json;
    }
    async refreshAccessToken(refreshToken) {
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
        const json = (await res.json());
        if (!res.ok) {
            const err = (json['error_description'] || json['error'] || 'token refresh failed');
            throw new common_1.BadRequestException(`Google token refresh failed: ${err}`);
        }
        return json;
    }
    async revokeToken(token) {
        try {
            await fetch(`${OAUTH_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
        }
        catch (err) {
            this.logger.warn(`Token revoke failed: ${err.message}`);
        }
    }
    async listAccounts(accessToken) {
        const data = await this.callJson(`${ACCOUNT_MGMT_API}/accounts`, accessToken);
        const accounts = data['accounts'] || [];
        return accounts.map((a) => {
            const name = a['name'] || '';
            return {
                name,
                accountId: name.replace(/^accounts\//, ''),
                displayName: a['accountName'] || name,
                type: a['type'] || 'PERSONAL',
            };
        });
    }
    async listLocations(accessToken, accountResourceName) {
        const params = new URLSearchParams({
            readMask: 'name,title,storefrontAddress',
            pageSize: '100',
        });
        const data = await this.callJson(`${BUSINESS_INFO_API}/${accountResourceName}/locations?${params.toString()}`, accessToken);
        const locations = data['locations'] || [];
        return locations.map((loc) => {
            const fullName = loc['name'] || '';
            const id = fullName.replace(/^locations\//, '');
            const addr = loc['storefrontAddress'];
            const lines = addr?.['addressLines'] || [];
            const locality = addr?.['locality'] || '';
            const addressStr = [...lines, locality].filter(Boolean).join(', ');
            return {
                name: fullName,
                locationId: id,
                title: loc['title'] || fullName,
                address: addressStr || undefined,
            };
        });
    }
    async listReviews(accessToken, accountId, locationId, options = {}) {
        const params = new URLSearchParams();
        params.set('pageSize', String(options.pageSize ?? 50));
        if (options.pageToken)
            params.set('pageToken', options.pageToken);
        const data = await this.callJson(`${MY_BUSINESS_V4}/accounts/${accountId}/locations/${locationId}/reviews?${params.toString()}`, accessToken);
        const raw = data['reviews'] || [];
        const reviews = raw.map((r) => {
            const reviewName = r['reviewId'] || r['name'] || '';
            const reviewer = r['reviewer'];
            const reviewReply = r['reviewReply'];
            const ratingStr = r['starRating'] || 'STAR_RATING_UNSPECIFIED';
            return {
                reviewId: reviewName.replace(/^.*\/reviews\//, '').replace(/^reviews\//, ''),
                reviewerName: reviewer?.['displayName'],
                reviewerPhotoUrl: reviewer?.['profilePhotoUrl'],
                rating: STAR_RATING_TO_INT[ratingStr] ?? 0,
                comment: r['comment'],
                createTime: new Date(r['createTime'] || Date.now()),
                updateTime: new Date(r['updateTime'] || r['createTime'] || Date.now()),
                hasOwnerReply: !!reviewReply,
                ownerReplyComment: reviewReply?.['comment'],
            };
        });
        return {
            reviews,
            nextPageToken: data['nextPageToken'],
            totalReviewCount: data['totalReviewCount'],
        };
    }
    async replyToReview(accessToken, accountId, locationId, reviewId, comment) {
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
        const data = (await res.json());
        if (!res.ok) {
            const errMsg = this.extractErrorMessage(data);
            throw new common_1.BadRequestException(`Failed to post reply: ${errMsg}`);
        }
        return {
            comment: data['comment'] || comment,
            updateTime: data['updateTime'] || new Date().toISOString(),
        };
    }
    async callJson(url, accessToken) {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(15000),
        });
        const data = (await res.json());
        if (!res.ok) {
            const errMsg = this.extractErrorMessage(data);
            throw new common_1.BadRequestException(`Google API error: ${errMsg}`);
        }
        return data;
    }
    extractErrorMessage(data) {
        const error = data['error'];
        if (!error)
            return 'unknown error';
        return error['message'] || error['status'] || 'unknown error';
    }
    static intToStarRating(rating) {
        return INT_TO_STAR_RATING[rating] || 'STAR_RATING_UNSPECIFIED';
    }
};
exports.GoogleBusinessClient = GoogleBusinessClient;
exports.GoogleBusinessClient = GoogleBusinessClient = GoogleBusinessClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleBusinessClient);
//# sourceMappingURL=google-business.client.js.map