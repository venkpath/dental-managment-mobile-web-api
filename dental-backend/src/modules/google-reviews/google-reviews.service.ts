import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { GoogleBusinessClient } from './google-business.client.js';
import { AiService } from '../ai/ai.service.js';
import { AiUsageService } from '../ai/ai-usage.service.js';
import { UpdateGoogleReviewSettingsDto } from './dto/update-settings.dto.js';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh tokens 5 min before expiry

interface ConnectionForApi {
  clinic_id: string;
  google_account_id: string;
  google_account_name: string;
  location_id: string | null;
  location_name: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: Date;
}

@Injectable()
export class GoogleReviewsService {
  private readonly logger = new Logger(GoogleReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleBusinessClient,
    private readonly aiService: AiService,
    private readonly aiUsage: AiUsageService,
  ) {}

  // ─── OAuth connect / disconnect ───────────────────────────────

  /** Build the consent URL the clinic admin should be redirected to. */
  buildConnectUrl(clinicId: string): { url: string } {
    return { url: this.google.buildAuthUrl(clinicId) };
  }

  /**
   * Handle the OAuth callback: exchange code → tokens, fetch the clinic's
   * Google account, and persist the connection.
   *
   * Returns the list of locations the admin can pick from. The clinic
   * admin must call `selectLocation()` afterwards to choose which physical
   * location's reviews to manage.
   */
  async handleOAuthCallback(params: {
    code: string;
    state: string;
    userId?: string;
  }): Promise<{ connection_status: string; account_name: string; locations: Array<{ location_id: string; location_name: string; address?: string }> }> {
    const clinicId = this.google.verifyState(params.state);

    const tokens = await this.google.exchangeCodeForTokens(params.code);
    if (!tokens.refresh_token) {
      // We forced prompt=consent so this should always come back. If it
      // doesn't, something's wrong with the consent screen — surface it.
      throw new BadRequestException(
        'Google did not return a refresh token. Disconnect this Google account from your Google permissions page and try again.',
      );
    }

    // Fetch the GBP account this user controls. We pick the first one — most
    // dental clinics will have a single account; multi-account orgs can pick
    // the location later.
    const accounts = await this.google.listAccounts(tokens.access_token);
    if (accounts.length === 0) {
      throw new BadRequestException(
        'No Google Business Profile account found for this Google user. Make sure you connected the account that owns your clinic listing.',
      );
    }
    const account = accounts[0]!;

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

    // Lazy-create settings row so the cron has something to read.
    await this.ensureSettings(clinicId);

    // Fetch locations the admin can choose from.
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

  async listLocations(clinicId: string): Promise<Array<{ location_id: string; location_name: string; address?: string }>> {
    const conn = await this.requireConnection(clinicId);
    const accessToken = await this.getValidAccessToken(conn);
    const accountName = `accounts/${conn.google_account_id}`;
    const locations = await this.google.listLocations(accessToken, accountName);
    return locations.map((l) => ({ location_id: l.locationId, location_name: l.title, address: l.address }));
  }

  async selectLocation(clinicId: string, locationId: string, locationName: string) {
    const conn = await this.requireConnection(clinicId);
    return this.prisma.googleBusinessConnection.update({
      where: { clinic_id: conn.clinic_id },
      data: { location_id: locationId, location_name: locationName },
    });
  }

  async disconnect(clinicId: string): Promise<{ disconnected: boolean }> {
    const conn = await this.prisma.googleBusinessConnection.findUnique({
      where: { clinic_id: clinicId },
    });
    if (!conn) return { disconnected: false };

    // Best-effort revoke; never fail disconnect on revoke error.
    await this.google.revokeToken(conn.refresh_token);
    await this.prisma.googleBusinessConnection.delete({ where: { clinic_id: clinicId } });
    return { disconnected: true };
  }

  async getConnectionStatus(clinicId: string) {
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

  // ─── Settings ─────────────────────────────────────────────────

  async ensureSettings(clinicId: string) {
    const existing = await this.prisma.googleReviewSettings.findUnique({
      where: { clinic_id: clinicId },
    });
    if (existing) return existing;
    return this.prisma.googleReviewSettings.create({ data: { clinic_id: clinicId } });
  }

  async getSettings(clinicId: string) {
    return this.ensureSettings(clinicId);
  }

  async updateSettings(clinicId: string, dto: UpdateGoogleReviewSettingsDto) {
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

  // ─── Reviews CRUD (UI) ────────────────────────────────────────

  async listReviews(clinicId: string, q: ListReviewsQueryDto) {
    const where: Record<string, unknown> = { clinic_id: clinicId };
    if (q.status) where['reply_status'] = q.status;
    if (q.rating) where['rating'] = q.rating;

    const [items, total, counts] = await Promise.all([
      this.prisma.googleReview.findMany({
        where,
        orderBy: { review_created_at: 'desc' },
        take: q.limit ?? 20,
        skip: q.offset ?? 0,
      }),
      this.prisma.googleReview.count({ where }),
      this.prisma.googleReview.groupBy({
        by: ['reply_status'],
        where: { clinic_id: clinicId },
        _count: true,
      }),
    ]);

    return {
      items,
      total,
      counts_by_status: Object.fromEntries(counts.map((c) => [c.reply_status, c._count])),
    };
  }

  async getReview(clinicId: string, reviewId: string) {
    const review = await this.prisma.googleReview.findUnique({ where: { id: reviewId } });
    if (!review || review.clinic_id !== clinicId) {
      throw new NotFoundException('Google review not found');
    }
    return review;
  }

  /**
   * Approve and post the AI-drafted reply (optionally edited).
   * Used by clinic admin when a review was queued for approval.
   */
  async approveAndPost(params: {
    clinicId: string;
    reviewId: string;
    userId: string;
    overrideReply?: string;
  }) {
    const review = await this.getReview(params.clinicId, params.reviewId);
    if (review.reply_status === 'posted') {
      throw new BadRequestException('Reply already posted');
    }
    const replyText = (params.overrideReply ?? review.ai_draft ?? '').trim();
    if (!replyText) {
      throw new BadRequestException('No reply text to post — generate a draft first');
    }

    const conn = await this.requireConnection(params.clinicId);
    if (!conn.location_id) {
      throw new BadRequestException('No Google location selected for this clinic');
    }

    const accessToken = await this.getValidAccessToken(conn);

    try {
      await this.google.replyToReview(
        accessToken,
        conn.google_account_id,
        conn.location_id,
        review.google_review_id,
        replyText,
      );
    } catch (err) {
      const message = (err as Error).message;
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

  /**
   * Re-generate the AI draft for a review (e.g. clinic admin didn't like the
   * first draft). Counts against AI quota — same as initial generation.
   */
  async regenerateDraft(clinicId: string, reviewId: string, userId: string) {
    const review = await this.getReview(clinicId, reviewId);
    if (review.reply_status === 'posted') {
      throw new BadRequestException('Cannot regenerate after the reply was posted');
    }

    await this.aiUsage.reserveSlot(clinicId);

    const settings = await this.ensureSettings(clinicId);
    const draft = await this.aiService.generateReviewReply(
      clinicId,
      {
        rating: review.rating,
        review_text: review.comment ?? undefined,
        reviewer_name: review.reviewer_name ?? undefined,
        tone: settings.tone as 'warm' | 'formal' | 'brief',
        custom_instructions: settings.custom_instructions ?? undefined,
        signature: settings.signature ?? undefined,
      },
      userId,
    );

    // After a manual regenerate, always queue for approval — the admin
    // explicitly asked for a new draft, so they should review it before posting.
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

  // ─── Sync + auto-reply pipeline (called by cron) ──────────────

  /**
   * Poll all clinics with an active connection + selected location for new
   * reviews, generate AI drafts and auto-post (or queue) per clinic settings.
   * Returns aggregated counts for logging.
   */
  async syncAllClinics(): Promise<{ clinicsProcessed: number; reviewsSynced: number; repliesPosted: number; queuedForApproval: number }> {
    const connections = await this.prisma.googleBusinessConnection.findMany({
      where: { status: 'active', location_id: { not: null } },
      include: { clinic: { select: { id: true, subscription_status: true } } },
    });

    let clinicsProcessed = 0;
    let reviewsSynced = 0;
    let repliesPosted = 0;
    let queuedForApproval = 0;

    for (const conn of connections) {
      // Skip clinics whose subscription is paused / cancelled
      if (!['active', 'trial'].includes(conn.clinic.subscription_status)) continue;

      try {
        const result = await this.syncClinic(conn.clinic_id);
        clinicsProcessed++;
        reviewsSynced += result.reviewsSynced;
        repliesPosted += result.repliesPosted;
        queuedForApproval += result.queuedForApproval;
      } catch (err) {
        this.logger.error(
          `Sync failed for clinic ${conn.clinic_id}: ${(err as Error).message}`,
          (err as Error).stack,
        );
        await this.prisma.googleBusinessConnection
          .update({
            where: { clinic_id: conn.clinic_id },
            data: { last_sync_error: (err as Error).message },
          })
          .catch(() => undefined);
      }
    }

    return { clinicsProcessed, reviewsSynced, repliesPosted, queuedForApproval };
  }

  /** Sync a single clinic — used by both the cron and manual "sync now" button. */
  async syncClinic(clinicId: string): Promise<{ reviewsSynced: number; repliesPosted: number; queuedForApproval: number }> {
    const conn = await this.requireConnection(clinicId);
    if (!conn.location_id) {
      throw new BadRequestException('No Google location selected — pick one first');
    }
    const settings = await this.ensureSettings(clinicId);

    const accessToken = await this.getValidAccessToken(conn);

    let reviewsSynced = 0;
    let repliesPosted = 0;
    let queuedForApproval = 0;

    let pageToken: string | undefined;
    let pageCount = 0;
    const MAX_PAGES = 5; // safety cap; 5 * 50 = 250 reviews per clinic per sync

    do {
      const page = await this.google.listReviews(
        accessToken,
        conn.google_account_id,
        conn.location_id,
        { pageToken, pageSize: 50 },
      );
      pageCount++;

      for (const review of page.reviews) {
        // Skip reviews the clinic owner has already replied to manually.
        // Also skip if we already have it AND have already posted/handled it.
        const existing = await this.prisma.googleReview.findUnique({
          where: {
            clinic_id_google_review_id: {
              clinic_id: clinicId,
              google_review_id: review.reviewId,
            },
          },
        });

        if (existing && (existing.reply_status === 'posted' || review.hasOwnerReply)) {
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

        // If owner has already replied (e.g. directly on Google), mark as such and move on.
        if (review.hasOwnerReply) {
          if (existing && existing.reply_status !== 'skipped') {
            await this.prisma.googleReview.update({
              where: { id: existing.id },
              data: { reply_status: 'skipped' },
            });
          }
          continue;
        }

        // Generate + post for any review still in `pending` state.
        if (settings.auto_reply_enabled) {
          try {
            const outcome = await this.handlePendingReview(
              clinicId,
              review.reviewId,
              {
                rating: review.rating,
                comment: review.comment,
                reviewerName: review.reviewerName,
              },
              {
                tone: settings.tone as 'warm' | 'formal' | 'brief',
                customInstructions: settings.custom_instructions ?? undefined,
                signature: settings.signature ?? undefined,
                autoPostMinRating: settings.auto_post_min_rating,
              },
              { accessToken, accountId: conn.google_account_id, locationId: conn.location_id },
            );
            if (outcome === 'posted') repliesPosted++;
            if (outcome === 'queued') queuedForApproval++;
          } catch (err) {
            this.logger.warn(
              `AI reply pipeline failed for review ${review.reviewId} (clinic ${clinicId}): ${(err as Error).message}`,
            );
          }
        }
      }

      pageToken = page.nextPageToken;
    } while (pageToken && pageCount < MAX_PAGES);

    await this.prisma.googleBusinessConnection.update({
      where: { clinic_id: clinicId },
      data: { last_synced_at: new Date(), last_sync_error: null },
    });

    return { reviewsSynced, repliesPosted, queuedForApproval };
  }

  /**
   * For one new review: generate AI draft, then either post immediately or
   * queue for clinic-admin approval based on rating + safety flag.
   */
  private async handlePendingReview(
    clinicId: string,
    googleReviewId: string,
    review: { rating: number; comment: string | null | undefined; reviewerName: string | null | undefined },
    settings: {
      tone: 'warm' | 'formal' | 'brief';
      customInstructions: string | undefined;
      signature: string | undefined;
      autoPostMinRating: number;
    },
    google: { accessToken: string; accountId: string; locationId: string },
  ): Promise<'posted' | 'queued' | 'failed'> {
    const dbRow = await this.prisma.googleReview.findUnique({
      where: { clinic_id_google_review_id: { clinic_id: clinicId, google_review_id: googleReviewId } },
    });
    if (!dbRow) return 'failed';

    // Try to reserve quota — silently skip if exhausted (better than blowing
    // up the cron). Clinic will be re-attempted on next sync after they top up.
    try {
      await this.aiUsage.reserveSlot(clinicId);
    } catch (err) {
      if (err instanceof ForbiddenException) {
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
      draft = await this.aiService.generateReviewReply(
        clinicId,
        {
          rating: review.rating,
          review_text: review.comment ?? undefined,
          reviewer_name: review.reviewerName ?? undefined,
          tone: settings.tone,
          custom_instructions: settings.customInstructions,
          signature: settings.signature,
        },
      );
    } catch (err) {
      // ai.service already releases the quota reservation on failure
      await this.prisma.googleReview.update({
        where: { id: dbRow.id },
        data: { reply_status: 'failed', last_error: (err as Error).message, retry_count: { increment: 1 } },
      });
      return 'failed';
    }

    // Decide: post or queue?
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
      return 'queued';
    }

    await this.prisma.googleReview.update({
      where: { id: dbRow.id },
      data: { reply_status: 'posting', ai_draft: draft.reply, language: draft.language },
    });

    try {
      await this.google.replyToReview(
        google.accessToken,
        google.accountId,
        google.locationId,
        googleReviewId,
        draft.reply,
      );
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
    } catch (err) {
      await this.prisma.googleReview.update({
        where: { id: dbRow.id },
        data: {
          reply_status: 'pending_approval', // fall back to manual approval after API failure
          last_error: (err as Error).message,
          retry_count: { increment: 1 },
        },
      });
      return 'queued';
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async requireConnection(clinicId: string): Promise<ConnectionForApi> {
    const conn = await this.prisma.googleBusinessConnection.findUnique({
      where: { clinic_id: clinicId },
    });
    if (!conn) {
      throw new NotFoundException('Google Business Profile is not connected for this clinic');
    }
    if (conn.status !== 'active') {
      throw new BadRequestException(`Google connection is in ${conn.status} state — please reconnect`);
    }
    return conn;
  }

  /**
   * Returns a non-expired access token, refreshing via the refresh token if
   * needed and persisting the new token.
   */
  private async getValidAccessToken(conn: ConnectionForApi): Promise<string> {
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
        // refresh_token is rotated only if Google sends a new one
        ...(refreshed.refresh_token && { refresh_token: refreshed.refresh_token }),
      },
    });
    return refreshed.access_token;
  }
}
