"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GoogleReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const google_business_client_js_1 = require("./google-business.client.js");
const ai_service_js_1 = require("../ai/ai.service.js");
const ai_usage_service_js_1 = require("../ai/ai-usage.service.js");
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const AI_PIPELINE_STATUSES = new Set(['pending', 'failed']);
let GoogleReviewsService = GoogleReviewsService_1 = class GoogleReviewsService {
    prisma;
    google;
    aiService;
    aiUsage;
    logger = new common_1.Logger(GoogleReviewsService_1.name);
    constructor(prisma, google, aiService, aiUsage) {
        this.prisma = prisma;
        this.google = google;
        this.aiService = aiService;
        this.aiUsage = aiUsage;
    }
    buildConnectUrl(clinicId) {
        return { url: this.google.buildAuthUrl(clinicId) };
    }
    async handleOAuthCallback(params) {
        const clinicId = this.google.verifyState(params.state);
        const tokens = await this.google.exchangeCodeForTokens(params.code);
        if (!tokens.refresh_token) {
            throw new common_1.BadRequestException('Google did not return a refresh token. Disconnect this Google account from your Google permissions page and try again.');
        }
        const accounts = await this.google.listAccounts(tokens.access_token);
        if (accounts.length === 0) {
            throw new common_1.BadRequestException('No Google Business Profile account found for this Google user. Make sure you connected the account that owns your clinic listing.');
        }
        const account = accounts[0];
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await this.prisma.googleBusinessConnection.upsert({
            where: { clinic_id: clinicId },
            create: {
                clinic_id: clinicId,
                google_account_id: account.accountId,
                google_account_name: account.displayName,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: expiresAt,
                scope: tokens.scope,
                status: 'active',
                connected_by: params.userId,
            },
            update: {
                google_account_id: account.accountId,
                google_account_name: account.displayName,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: expiresAt,
                scope: tokens.scope,
                status: 'active',
                last_sync_error: null,
                connected_by: params.userId,
            },
        });
        await this.ensureSettings(clinicId);
        const locations = await this.google.listLocations(tokens.access_token, account.name);
        return {
            connection_status: 'connected',
            account_name: account.displayName,
            locations: locations.map((l) => ({
                location_id: l.locationId,
                location_name: l.title,
                address: l.address,
            })),
        };
    }
    async listLocations(clinicId) {
        const conn = await this.requireConnection(clinicId);
        const accessToken = await this.getValidAccessToken(conn);
        const accountName = `accounts/${conn.google_account_id}`;
        const locations = await this.google.listLocations(accessToken, accountName);
        return locations.map((l) => ({ location_id: l.locationId, location_name: l.title, address: l.address }));
    }
    async selectLocation(clinicId, locationId, locationName) {
        const conn = await this.requireConnection(clinicId);
        return this.prisma.googleBusinessConnection.update({
            where: { clinic_id: conn.clinic_id },
            data: { location_id: locationId, location_name: locationName },
        });
    }
    async disconnect(clinicId) {
        const conn = await this.prisma.googleBusinessConnection.findUnique({
            where: { clinic_id: clinicId },
        });
        if (!conn)
            return { disconnected: false };
        await this.google.revokeToken(conn.refresh_token);
        await this.prisma.googleBusinessConnection.delete({ where: { clinic_id: clinicId } });
        return { disconnected: true };
    }
    async getConnectionStatus(clinicId) {
        const conn = await this.prisma.googleBusinessConnection.findUnique({
            where: { clinic_id: clinicId },
            select: {
                google_account_id: true,
                google_account_name: true,
                location_id: true,
                location_name: true,
                status: true,
                last_synced_at: true,
                last_sync_error: true,
                scope: true,
            },
        });
        return {
            connected: !!conn,
            ...conn,
        };
    }
    async ensureSettings(clinicId) {
        const existing = await this.prisma.googleReviewSettings.findUnique({
            where: { clinic_id: clinicId },
        });
        if (existing)
            return existing;
        return this.prisma.googleReviewSettings.create({
            data: { clinic_id: clinicId, auto_reply_enabled: false },
        });
    }
    async getSettings(clinicId) {
        return this.ensureSettings(clinicId);
    }
    async updateSettings(clinicId, dto) {
        await this.ensureSettings(clinicId);
        return this.prisma.googleReviewSettings.update({
            where: { clinic_id: clinicId },
            data: {
                ...(dto.auto_reply_enabled !== undefined && { auto_reply_enabled: dto.auto_reply_enabled }),
                ...(dto.auto_post_min_rating !== undefined && { auto_post_min_rating: dto.auto_post_min_rating }),
                ...(dto.tone !== undefined && { tone: dto.tone }),
                ...(dto.custom_instructions !== undefined && { custom_instructions: dto.custom_instructions }),
                ...(dto.signature !== undefined && { signature: dto.signature }),
                ...(dto.notify_admin_on_low !== undefined && { notify_admin_on_low: dto.notify_admin_on_low }),
            },
        });
    }
    async listReviews(clinicId, q) {
        const where = { clinic_id: clinicId };
        if (q.status)
            where['reply_status'] = q.status;
        if (q.rating)
            where['rating'] = q.rating;
        const limit = q.limit ?? 20;
        const page = q.page ?? 1;
        const skip = q.offset ?? (page - 1) * limit;
        const [items, total, counts] = await Promise.all([
            this.prisma.googleReview.findMany({
                where,
                orderBy: { review_created_at: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.googleReview.count({ where }),
            this.prisma.googleReview.groupBy({
                by: ['reply_status'],
                where: { clinic_id: clinicId },
                _count: true,
            }),
        ]);
        return {
            data: items,
            meta: {
                total,
                page,
                limit,
                total_pages: Math.max(1, Math.ceil(total / limit)),
                counts_by_status: Object.fromEntries(counts.map((c) => [c.reply_status, c._count])),
            },
        };
    }
    async getReview(clinicId, reviewId) {
        const review = await this.prisma.googleReview.findUnique({ where: { id: reviewId } });
        if (!review || review.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Google review not found');
        }
        return review;
    }
    async approveAndPost(params) {
        const review = await this.getReview(params.clinicId, params.reviewId);
        if (review.reply_status === 'posted') {
            throw new common_1.BadRequestException('Reply already posted');
        }
        const replyText = (params.overrideReply ?? review.ai_draft ?? '').trim();
        if (!replyText) {
            throw new common_1.BadRequestException('No reply text to post — generate a draft first');
        }
        const conn = await this.requireConnection(params.clinicId);
        if (!conn.location_id) {
            throw new common_1.BadRequestException('No Google location selected for this clinic');
        }
        const accessToken = await this.getValidAccessToken(conn);
        try {
            await this.google.replyToReview(accessToken, conn.google_account_id, conn.location_id, review.google_review_id, replyText);
        }
        catch (err) {
            const message = err.message;
            await this.prisma.googleReview.update({
                where: { id: review.id },
                data: {
                    reply_status: 'failed',
                    last_error: message,
                    retry_count: { increment: 1 },
                },
            });
            throw err;
        }
        return this.prisma.googleReview.update({
            where: { id: review.id },
            data: {
                reply_status: 'posted',
                posted_reply: replyText,
                posted_at: new Date(),
                approved_by: params.userId,
                approved_at: new Date(),
                last_error: null,
            },
        });
    }
    async regenerateDraft(clinicId, reviewId, userId) {
        const review = await this.getReview(clinicId, reviewId);
        if (review.reply_status === 'posted') {
            throw new common_1.BadRequestException('Cannot regenerate after the reply was posted');
        }
        await this.aiUsage.reserveSlot(clinicId);
        const settings = await this.ensureSettings(clinicId);
        const draft = await this.aiService.generateReviewReply(clinicId, {
            rating: review.rating,
            review_text: review.comment ?? undefined,
            reviewer_name: review.reviewer_name ?? undefined,
            tone: settings.tone,
            custom_instructions: settings.custom_instructions ?? undefined,
            signature: settings.signature ?? undefined,
        }, userId);
        return this.prisma.googleReview.update({
            where: { id: review.id },
            data: {
                ai_draft: draft.reply,
                language: draft.language,
                reply_status: 'pending_approval',
                last_error: null,
            },
        });
    }
    async syncAllClinics() {
        const connections = await this.prisma.googleBusinessConnection.findMany({
            where: { status: 'active', location_id: { not: null } },
            include: { clinic: { select: { id: true, subscription_status: true } } },
        });
        let clinicsProcessed = 0;
        let reviewsSynced = 0;
        let repliesPosted = 0;
        let queuedForApproval = 0;
        for (const conn of connections) {
            if (!['active', 'trial'].includes(conn.clinic.subscription_status))
                continue;
            try {
                const result = await this.syncClinic(conn.clinic_id);
                clinicsProcessed++;
                reviewsSynced += result.reviewsSynced;
                repliesPosted += result.repliesPosted;
                queuedForApproval += result.queuedForApproval;
            }
            catch (err) {
                this.logger.error(`Sync failed for clinic ${conn.clinic_id}: ${err.message}`, err.stack);
                await this.prisma.googleBusinessConnection
                    .update({
                    where: { clinic_id: conn.clinic_id },
                    data: { last_sync_error: err.message },
                })
                    .catch(() => undefined);
            }
        }
        return { clinicsProcessed, reviewsSynced, repliesPosted, queuedForApproval };
    }
    async syncClinic(clinicId) {
        const conn = await this.requireConnection(clinicId);
        if (!conn.location_id) {
            throw new common_1.BadRequestException('No Google location selected — pick one first');
        }
        const settings = await this.ensureSettings(clinicId);
        const accessToken = await this.getValidAccessToken(conn);
        let reviewsSynced = 0;
        let repliesPosted = 0;
        let queuedForApproval = 0;
        let pageToken;
        let pageCount = 0;
        const MAX_PAGES = 20;
        do {
            const page = await this.google.listReviews(accessToken, conn.google_account_id, conn.location_id, { pageToken, pageSize: 50 });
            pageCount++;
            for (const review of page.reviews) {
                const existing = await this.prisma.googleReview.findUnique({
                    where: {
                        clinic_id_google_review_id: {
                            clinic_id: clinicId,
                            google_review_id: review.reviewId,
                        },
                    },
                });
                if (existing && (existing.reply_status === 'posted' || review.hasOwnerReply)) {
                    if (existing) {
                        await this.updateSyncedReviewFields(existing.id, review);
                    }
                    continue;
                }
                const isNew = !existing;
                if (isNew) {
                    await this.prisma.googleReview.create({
                        data: {
                            clinic_id: clinicId,
                            google_review_id: review.reviewId,
                            location_id: conn.location_id,
                            reviewer_name: review.reviewerName,
                            reviewer_photo_url: review.reviewerPhotoUrl,
                            rating: review.rating,
                            comment: review.comment,
                            review_created_at: review.createTime,
                            review_updated_at: review.updateTime,
                            reply_status: review.hasOwnerReply ? 'skipped' : 'pending',
                        },
                    });
                    reviewsSynced++;
                }
                else {
                    await this.updateSyncedReviewFields(existing.id, review);
                }
                if (review.hasOwnerReply) {
                    if (existing && existing.reply_status !== 'skipped') {
                        await this.prisma.googleReview.update({
                            where: { id: existing.id },
                            data: { reply_status: 'skipped' },
                        });
                    }
                    continue;
                }
                const canRunAi = settings.auto_reply_enabled &&
                    (!existing || AI_PIPELINE_STATUSES.has(existing.reply_status));
                if (canRunAi) {
                    try {
                        const outcome = await this.handlePendingReview(clinicId, review.reviewId, {
                            rating: review.rating,
                            comment: review.comment,
                            reviewerName: review.reviewerName,
                        }, {
                            tone: settings.tone,
                            customInstructions: settings.custom_instructions ?? undefined,
                            signature: settings.signature ?? undefined,
                            autoPostMinRating: settings.auto_post_min_rating,
                            notifyAdminOnLow: settings.notify_admin_on_low,
                        }, { accessToken, accountId: conn.google_account_id, locationId: conn.location_id });
                        if (outcome === 'posted')
                            repliesPosted++;
                        if (outcome === 'queued')
                            queuedForApproval++;
                    }
                    catch (err) {
                        this.logger.warn(`AI reply pipeline failed for review ${review.reviewId} (clinic ${clinicId}): ${err.message}`);
                    }
                }
            }
            pageToken = page.nextPageToken;
        } while (pageToken && pageCount < MAX_PAGES);
        await this.prisma.googleBusinessConnection.update({
            where: { clinic_id: clinicId },
            data: { last_synced_at: new Date(), last_sync_error: null },
        });
        return { synced: reviewsSynced, reviewsSynced, repliesPosted, queuedForApproval };
    }
    async handlePendingReview(clinicId, googleReviewId, review, settings, google) {
        const dbRow = await this.prisma.googleReview.findUnique({
            where: { clinic_id_google_review_id: { clinic_id: clinicId, google_review_id: googleReviewId } },
        });
        if (!dbRow || !AI_PIPELINE_STATUSES.has(dbRow.reply_status))
            return 'failed';
        try {
            await this.aiUsage.reserveSlot(clinicId);
        }
        catch (err) {
            if (err instanceof common_1.ForbiddenException) {
                this.logger.log(`AI quota exhausted for clinic ${clinicId} — review ${googleReviewId} stays pending.`);
                return 'failed';
            }
            throw err;
        }
        await this.prisma.googleReview.update({
            where: { id: dbRow.id },
            data: { reply_status: 'generating' },
        });
        let draft;
        try {
            draft = await this.aiService.generateReviewReply(clinicId, {
                rating: review.rating,
                review_text: review.comment ?? undefined,
                reviewer_name: review.reviewerName ?? undefined,
                tone: settings.tone,
                custom_instructions: settings.customInstructions,
                signature: settings.signature,
            });
        }
        catch (err) {
            await this.prisma.googleReview.update({
                where: { id: dbRow.id },
                data: { reply_status: 'failed', last_error: err.message, retry_count: { increment: 1 } },
            });
            return 'failed';
        }
        const meetsRating = review.rating >= settings.autoPostMinRating;
        const safe = draft.is_safe_to_auto_post;
        const shouldAutoPost = meetsRating && safe;
        if (!shouldAutoPost) {
            await this.prisma.googleReview.update({
                where: { id: dbRow.id },
                data: {
                    reply_status: 'pending_approval',
                    ai_draft: draft.reply,
                    language: draft.language,
                },
            });
            if (settings.notifyAdminOnLow && review.rating <= 2) {
                await this.notifyAdminsOfLowRating(clinicId, dbRow.id, review.rating);
            }
            return 'queued';
        }
        await this.prisma.googleReview.update({
            where: { id: dbRow.id },
            data: { reply_status: 'posting', ai_draft: draft.reply, language: draft.language },
        });
        try {
            await this.google.replyToReview(google.accessToken, google.accountId, google.locationId, googleReviewId, draft.reply);
            await this.prisma.googleReview.update({
                where: { id: dbRow.id },
                data: {
                    reply_status: 'posted',
                    posted_reply: draft.reply,
                    posted_at: new Date(),
                    last_error: null,
                },
            });
            return 'posted';
        }
        catch (err) {
            await this.prisma.googleReview.update({
                where: { id: dbRow.id },
                data: {
                    reply_status: 'pending_approval',
                    last_error: err.message,
                    retry_count: { increment: 1 },
                },
            });
            return 'queued';
        }
    }
    async updateSyncedReviewFields(reviewId, review) {
        await this.prisma.googleReview.update({
            where: { id: reviewId },
            data: {
                reviewer_name: review.reviewerName,
                reviewer_photo_url: review.reviewerPhotoUrl,
                rating: review.rating,
                comment: review.comment,
                review_updated_at: review.updateTime,
            },
        });
    }
    async notifyAdminsOfLowRating(clinicId, reviewId, rating) {
        const admins = await this.prisma.user.findMany({
            where: { clinic_id: clinicId, role: 'Admin', status: 'active' },
            select: { id: true },
        });
        if (!admins.length)
            return;
        await this.prisma.notification.createMany({
            data: admins.map((admin) => ({
                clinic_id: clinicId,
                user_id: admin.id,
                type: 'google_review_low_rating',
                title: 'Low Google review needs your attention',
                body: `A ${rating}-star Google review was synced and is waiting for your approval.`,
                metadata: { review_id: reviewId, source: 'google', rating },
            })),
        });
    }
    async requireConnection(clinicId) {
        const conn = await this.prisma.googleBusinessConnection.findUnique({
            where: { clinic_id: clinicId },
        });
        if (!conn) {
            throw new common_1.NotFoundException('Google Business Profile is not connected for this clinic');
        }
        if (conn.status !== 'active') {
            throw new common_1.BadRequestException(`Google connection is in ${conn.status} state — please reconnect`);
        }
        return conn;
    }
    async getValidAccessToken(conn) {
        if (conn.token_expires_at.getTime() - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
            return conn.access_token;
        }
        const refreshed = await this.google.refreshAccessToken(conn.refresh_token);
        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
        await this.prisma.googleBusinessConnection.update({
            where: { clinic_id: conn.clinic_id },
            data: {
                access_token: refreshed.access_token,
                token_expires_at: expiresAt,
                ...(refreshed.refresh_token && { refresh_token: refreshed.refresh_token }),
            },
        });
        return refreshed.access_token;
    }
};
exports.GoogleReviewsService = GoogleReviewsService;
exports.GoogleReviewsService = GoogleReviewsService = GoogleReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        google_business_client_js_1.GoogleBusinessClient,
        ai_service_js_1.AiService,
        ai_usage_service_js_1.AiUsageService])
], GoogleReviewsService);
//# sourceMappingURL=google-reviews.service.js.map