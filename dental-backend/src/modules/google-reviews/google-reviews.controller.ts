import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { GoogleReviewsService } from './google-reviews.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { SelectLocationDto } from './dto/select-location.dto.js';
import { UpdateGoogleReviewSettingsDto } from './dto/update-settings.dto.js';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';
import { ApproveReplyDto } from './dto/approve-reply.dto.js';

@ApiTags('Google Reviews')
@ApiBearerAuth()
@Controller('google-reviews')
export class GoogleReviewsController {
  constructor(
    private readonly googleReviews: GoogleReviewsService,
    private readonly config: ConfigService,
  ) {}

  // ─── Connection / OAuth ───────────────────────────────────────

  @Get('auth-url')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get the Google OAuth consent URL for the clinic admin to connect their Google Business Profile' })
  getAuthUrl(@Req() req: Request) {
    return this.googleReviews.buildConnectUrl(req.user!.clinicId);
  }

  /**
   * Google redirects the browser here after consent. This endpoint is public
   * (no auth header) — the clinic identity is carried in the signed `state`
   * parameter. We exchange the code, persist the connection, then redirect
   * the browser back to the clinic-side dashboard.
   */
  @Get('oauth/callback')
  @Public()
  @ApiOperation({ summary: 'OAuth callback handler (Google redirects here after consent)' })
  async oauthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>('app.frontendUrl') || 'http://localhost:3001';
    const redirectBase = `${frontendUrl}/settings/integrations/google-reviews`;

    if (error) {
      return res.redirect(`${redirectBase}?status=error&message=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return res.redirect(`${redirectBase}?status=error&message=missing_params`);
    }

    try {
      const result = await this.googleReviews.handleOAuthCallback({ code, state });
      const params = new URLSearchParams({
        status: 'connected',
        account_name: result.account_name,
        location_count: String(result.locations.length),
      });
      return res.redirect(`${redirectBase}?${params.toString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      return res.redirect(`${redirectBase}?status=error&message=${encodeURIComponent(message)}`);
    }
  }

  @Get('connection')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current Google Business Profile connection status for the clinic' })
  getConnection(@Req() req: Request) {
    return this.googleReviews.getConnectionStatus(req.user!.clinicId);
  }

  @Get('locations')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List Google Business locations the connected account can manage (for picking which one to monitor)' })
  listLocations(@Req() req: Request) {
    return this.googleReviews.listLocations(req.user!.clinicId);
  }

  @Post('select-location')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Pick which Google Business location this clinic should manage reviews for' })
  selectLocation(@Req() req: Request, @Body() dto: SelectLocationDto) {
    return this.googleReviews.selectLocation(req.user!.clinicId, dto.location_id, dto.location_name);
  }

  @Delete('connection')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Disconnect this clinic from Google Business Profile (revokes refresh token)' })
  disconnect(@Req() req: Request) {
    return this.googleReviews.disconnect(req.user!.clinicId);
  }

  // ─── Settings ─────────────────────────────────────────────────

  @Get('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get Google review auto-reply settings for the clinic' })
  getSettings(@Req() req: Request) {
    return this.googleReviews.getSettings(req.user!.clinicId);
  }

  @Patch('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update Google review auto-reply settings (tone, threshold, instructions)' })
  updateSettings(@Req() req: Request, @Body() dto: UpdateGoogleReviewSettingsDto) {
    return this.googleReviews.updateSettings(req.user!.clinicId, dto);
  }

  // ─── Reviews ──────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'List synced Google reviews with optional status / rating filters' })
  listReviews(@Req() req: Request, @Query() query: ListReviewsQueryDto) {
    return this.googleReviews.listReviews(req.user!.clinicId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Get a single Google review with its AI draft reply' })
  getReview(@Req() req: Request, @Param('id') id: string) {
    return this.googleReviews.getReview(req.user!.clinicId, id);
  }

  @Post(':id/regenerate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Regenerate the AI draft reply for a review (uses one AI quota slot)' })
  regenerate(@Req() req: Request, @Param('id') id: string) {
    return this.googleReviews.regenerateDraft(req.user!.clinicId, id, req.user!.userId);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve and post the AI draft reply (optionally with edits) to Google' })
  approve(@Req() req: Request, @Param('id') id: string, @Body() dto: ApproveReplyDto) {
    return this.googleReviews.approveAndPost({
      clinicId: req.user!.clinicId,
      reviewId: id,
      userId: req.user!.userId,
      overrideReply: dto.reply,
    });
  }

  // ─── Manual sync (admin-triggered) ────────────────────────────

  @Post('sync')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger a Google review sync for this clinic (also runs hourly via cron)' })
  syncNow(@Req() req: Request) {
    return this.googleReviews.syncClinic(req.user!.clinicId);
  }
}
