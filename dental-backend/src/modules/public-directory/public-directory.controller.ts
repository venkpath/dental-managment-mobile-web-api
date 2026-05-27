import {
  Controller, Get, Post, Param, Body, Query, Res,
  ParseUUIDPipe, NotFoundException, BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsInt, IsNumber, IsBoolean, Min, Max, MinLength,
  MaxLength, IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { randomBytes } from 'crypto';

// ─── DTOs ───────────────────────────────────────────────────────────────────

class DirectorySearchQuery {
  @ApiPropertyOptional({ description: 'User latitude for geo search' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'User longitude for geo search' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ description: 'Search by city name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by specialty' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string;

  @ApiPropertyOptional({ description: 'Free text search (clinic name, doctor name)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number;

  @ApiPropertyOptional({ description: 'Only return clinics open today with available slots' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  @IsBoolean()
  availableToday?: boolean;

  @ApiPropertyOptional({ description: 'Radius in km — only return clinics within this distance (requires lat+lng)', example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radius?: number;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['relevance', 'rating', 'distance', 'reviews'] })
  @IsOptional()
  @IsString()
  @IsIn(['relevance', 'rating', 'distance', 'reviews'])
  sort?: string;

  @ApiPropertyOptional({ description: 'Filter by country (case-insensitive exact match against clinic country field)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

class SubmitReviewDto {
  @ApiProperty({ example: 'Priya Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  reviewer_name!: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  overall_rating!: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  cleanliness_rating?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  staff_rating?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  wait_time_rating?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  value_rating?: number;

  @ApiPropertyOptional({ example: 'Great experience!' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

class ReviewSortQuery {
  @ApiPropertyOptional({ enum: ['recent', 'highest', 'lowest'] })
  @IsOptional()
  @IsIn(['recent', 'highest', 'lowest'])
  sort?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

// ─── Haversine distance in km ────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── IST availability helpers ─────────────────────────────────────────────────

/** Returns current IST context needed for availability checks. */
function getISTContext() {
  const now = new Date();
  // IST = UTC + 5h30m (330 minutes)
  const istMs = now.getTime() + 330 * 60 * 1000;
  const istDate = new Date(istMs);

  const istMinutes = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

  // Schema working_days: 1=Mon, 2=Tue … 6=Sat, 7=Sun
  const jsDay = istDate.getUTCDay(); // 0=Sun … 6=Sat
  const schemaDay = jsDay === 0 ? 7 : jsDay;

  // appointment_date is stored as UTC midnight of the calendar date (Prisma @db.Date)
  const todayStart = new Date(
    Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()),
  );
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  return { istMinutes, schemaDay, todayStart, todayEnd };
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fmt12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

type BranchSchedule = {
  working_days: string | null;
  working_start_time: string | null;
  working_end_time: string | null;
  lunch_start_time: string | null;
  lunch_end_time: string | null;
  slot_duration: number | null;
  buffer_minutes: number | null;
};

function computeClinicAvailability(
  branches: BranchSchedule[],
  schemaDay: number,
  istMinutes: number,
  bookedToday: number,
) {
  let bestBranch: BranchSchedule | null = null;
  let bestTotalSlots = -1;

  for (const b of branches) {
    if (!b.working_days || !b.working_start_time || !b.working_end_time) continue;
    const days = b.working_days.split(',').map((d) => parseInt(d.trim(), 10));
    if (!days.includes(schemaDay)) continue;

    const startMin = timeToMins(b.working_start_time);
    const endMin = timeToMins(b.working_end_time);
    let workMins = endMin - startMin;
    if (workMins <= 0) continue;

    if (b.lunch_start_time && b.lunch_end_time) {
      const lunchMins = timeToMins(b.lunch_end_time) - timeToMins(b.lunch_start_time);
      workMins -= Math.max(0, lunchMins);
    }

    const slotMin = Math.max(1, (b.slot_duration ?? 15) + (b.buffer_minutes ?? 0));
    const total = Math.max(0, Math.floor(workMins / slotMin));
    if (total > bestTotalSlots) { bestTotalSlots = total; bestBranch = b; }
  }

  if (!bestBranch) {
    return {
      available_today: false, open_now: false,
      opens_at: null, closes_at: null,
      total_slots_today: null, available_slots_today: null,
    };
  }

  const startMin = timeToMins(bestBranch.working_start_time!);
  const endMin   = timeToMins(bestBranch.working_end_time!);
  const openNow  = istMinutes >= startMin && istMinutes < endMin;
  const availableSlots = Math.max(0, bestTotalSlots - bookedToday);

  return {
    available_today: true,
    open_now: openNow,
    opens_at:  fmt12h(bestBranch.working_start_time!),
    closes_at: fmt12h(bestBranch.working_end_time!),
    total_slots_today: bestTotalSlots,
    available_slots_today: availableSlots,
  };
}

// ─── Controller ─────────────────────────────────────────────────────────────

@SkipThrottle()
@ApiTags('Public Directory')
@Controller('public/directory')
export class PublicDirectoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  // ── GET /public/directory — search / list clinics ──
  @Get()
  @Public()
  @ApiOperation({ summary: 'Search publicly listed dental clinics' })
  async searchClinics(@Query() query: DirectorySearchQuery, @Res({ passthrough: true }) res: Response) {
    const { lat, lng, city, specialty, q, country, page = 1, limit = 12, availableToday, radius, sort = 'relevance' } = query;

    // Cache unfiltered listing pages for 60 s (CDN/browser) — availability
    // data is coarse enough that a 1-minute stale window is acceptable.
    const isSimpleList = !q && !availableToday && !lat && !lng && !specialty && !city && !country;
    if (isSimpleList) {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    }

    // ── Build where clause ──────────────────────────────────────────────────
    const where: Record<string, unknown> = {
      listed_in_directory: true,
      is_suspended: false,
    };
    if (city)      where['city']        = { contains: city,     mode: 'insensitive' };
    if (specialty) where['specialties'] = { contains: specialty, mode: 'insensitive' };
    // Country filter: show clinics matching the country OR clinics with no country set
    // (clinics that haven't filled in their country still appear for all audiences)
    if (country) {
      where['AND'] = [{
        OR: [
          { country: { equals: country, mode: 'insensitive' } },
          { country: null },
        ],
      }];
    }
    if (q) {
      where['OR'] = [
        { name:       { contains: q, mode: 'insensitive' } },
        { city:       { contains: q, mode: 'insensitive' } },
        { specialties:{ contains: q, mode: 'insensitive' } },
      ];
    }

    // ── Fetch clinics with branches + reviews + doctors ─────────────────────
    const clinics = await this.prisma.clinic.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      take: 500, // safety cap — paginate in-memory after enrichment
      select: {
        id: true, name: true, address: true, city: true, state: true,
        country: true, phone: true, logo_url: true, clinic_description: true,
        specialties: true, latitude: true, longitude: true,
        working_hours_label: true, google_maps_url: true, website_url: true,
        directory_reviews: {
          where: { is_visible: true },
          select: { overall_rating: true },
        },
        users: {
          where: {
            status: 'active',
            listed_in_directory: true,
            OR: [
              { is_doctor: true },
              { role: 'Dentist' },
              { role: 'Consultant' },
            ],
          },
          select: { id: true, name: true, specializations: true, years_experience: true, profile_photo_url: true },
          take: 3,
        },
        branches: {
          select: {
            id: true, photo_url: true,
            working_days: true, working_start_time: true, working_end_time: true,
            lunch_start_time: true, lunch_end_time: true,
            slot_duration: true, buffer_minutes: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // ── Batch-count today's booked appointments per clinic ──────────────────
    const { istMinutes, schemaDay, todayStart, todayEnd } = getISTContext();
    const clinicIds = clinics.map((c) => c.id);

    const apptCounts = clinicIds.length
      ? await this.prisma.appointment.groupBy({
          by: ['clinic_id'],
          where: {
            clinic_id: { in: clinicIds },
            appointment_date: { gte: todayStart, lt: todayEnd },
            status: { not: 'cancelled' },
          },
          _count: { id: true },
        })
      : [];

    const apptCountMap = new Map(apptCounts.map((a) => [a.clinic_id, a._count.id]));

    // ── Enrich each clinic ──────────────────────────────────────────────────
    let enriched = clinics.map((c) => {
      const reviews = c.directory_reviews;
      const avg = reviews.length
        ? reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length
        : null;
      const distKm =
        lat != null && lng != null && c.latitude && c.longitude
          ? haversineKm(lat, lng, c.latitude, c.longitude)
          : null;

      const bookedToday = apptCountMap.get(c.id) ?? 0;
      const avail = computeClinicAvailability(c.branches, schemaDay, istMinutes, bookedToday);

      const coverBranch = c.branches.find((b) => b.photo_url) ?? null;

      return {
        id: c.id, name: c.name, address: c.address, city: c.city, state: c.state,
        country: c.country, phone: c.phone, logo_url: c.logo_url,
        clinic_description: c.clinic_description, specialties: c.specialties,
        working_hours_label: c.working_hours_label,
        google_maps_url: c.google_maps_url, website_url: c.website_url,
        users: c.users,
        branch_cover_id: coverBranch?.id ?? null,
        review_count: reviews.length,
        avg_rating: avg ? Math.round(avg * 10) / 10 : null,
        distance_km: distKm ? Math.round(distKm * 10) / 10 : null,
        // availability
        available_today:      avail.available_today,
        open_now:             avail.open_now,
        opens_at:             avail.opens_at,
        closes_at:            avail.closes_at,
        total_slots_today:    avail.total_slots_today,
        available_slots_today: avail.available_slots_today,
      };
    });

    // ── Filter by availableToday ────────────────────────────────────────────
    if (availableToday) {
      enriched = enriched.filter((c) => c.available_today);
    }

    // ── Filter by radius (only when coords + radius both provided) ───────────
    if (lat != null && lng != null && radius != null) {
      enriched = enriched.filter((c) => c.distance_km != null && c.distance_km <= radius);
    }

    // ── Sort ────────────────────────────────────────────────────────────────
    if (sort === 'rating') {
      enriched.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    } else if (sort === 'reviews') {
      enriched.sort((a, b) => b.review_count - a.review_count);
    } else if (sort === 'distance' || (lat != null && lng != null)) {
      // distance sort: explicit request OR coords present (Near me default)
      enriched.sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
    }

    // ── Paginate after sort & filter ────────────────────────────────────────
    const total = enriched.length;
    const skip = (page - 1) * limit;
    const paginated = enriched.slice(skip, skip + limit);

    return {
      data: paginated,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  // ── GET /public/directory/:clinicId — full clinic detail ──
  @Get(':clinicId')
  @Public()
  @ApiOperation({ summary: 'Get full clinic detail page data' })
  async getClinicDetail(@Param('clinicId', ParseUUIDPipe) clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId, listed_in_directory: true, is_suspended: false },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        country: true,
        logo_url: true,
        clinic_description: true,
        specialties: true,
        latitude: true,
        longitude: true,
        working_hours_label: true,
        google_maps_url: true,
        website_url: true,
        established_year: true,
        languages_spoken: true,
        directory_treatments: true,
        gallery_images: true,
        // Branches for booking
        branches: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            photo_url: true,
            latitude: true,
            longitude: true,
            working_start_time: true,
            working_end_time: true,
            working_days: true,
            lunch_start_time: true,
            lunch_end_time: true,
            slot_duration: true,
          },
          orderBy: { name: 'asc' },
        },
        // Doctors
        users: {
          where: {
            status: 'active',
            listed_in_directory: true,
            OR: [
              { is_doctor: true },
              { role: 'Dentist' },
              { role: 'Consultant' },
            ],
          },
          select: {
            id: true,
            name: true,
            bio: true,
            years_experience: true,
            education: true,
            specializations: true,
            languages_spoken: true,
            consultation_fee: true,
            profile_photo_url: true,
            directory_reviews: {
              where: { is_visible: true },
              select: { overall_rating: true },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!clinic) throw new NotFoundException('Clinic not found or not publicly listed');

    // Review stats
    const [reviewStats, recentReviews] = await Promise.all([
      this.prisma.clinicDirectoryReview.aggregate({
        where: { clinic_id: clinicId, is_visible: true },
        _avg: {
          overall_rating: true,
          cleanliness_rating: true,
          staff_rating: true,
          wait_time_rating: true,
          value_rating: true,
        },
        _count: { id: true },
      }),
      this.prisma.clinicDirectoryReview.findMany({
        where: { clinic_id: clinicId, is_visible: true },
        select: {
          id: true,
          reviewer_name: true,
          overall_rating: true,
          cleanliness_rating: true,
          staff_rating: true,
          wait_time_rating: true,
          value_rating: true,
          comment: true,
          is_verified: true,
          created_at: true,
          doctor: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);

    // Rating distribution
    const distribution = await this.prisma.clinicDirectoryReview.groupBy({
      by: ['overall_rating'],
      where: { clinic_id: clinicId, is_visible: true },
      _count: { id: true },
    });

    const branches = await Promise.all(
      clinic.branches.map(async (b) => {
        const signedPhoto = b.photo_url
          ? await this.s3.getSignedUrl(b.photo_url).catch(() => null)
          : null;
        return { ...b, photo_url: signedPhoto };
      }),
    );

    const doctors = await Promise.all(
      clinic.users.map(async (d) => {
        const dReviews = d.directory_reviews;
        const dAvg = dReviews.length
          ? dReviews.reduce((s, r) => s + r.overall_rating, 0) / dReviews.length
          : null;
        const signedPhoto = d.profile_photo_url
          ? await this.s3.getSignedUrl(d.profile_photo_url).catch(() => null)
          : null;
        return {
          ...d,
          profile_photo_url: signedPhoto,
          directory_reviews: undefined,
          review_count: dReviews.length,
          avg_rating: dAvg ? Math.round(dAvg * 10) / 10 : null,
          consultation_fee: d.consultation_fee ? Number(d.consultation_fee) : null,
        };
      }),
    );

    return {
      ...clinic,
      branches,
      users: undefined,
      doctors,
      reviews: {
        total: reviewStats._count.id,
        avg_overall: reviewStats._avg.overall_rating
          ? Math.round(Number(reviewStats._avg.overall_rating) * 10) / 10
          : null,
        avg_cleanliness: reviewStats._avg.cleanliness_rating
          ? Math.round(Number(reviewStats._avg.cleanliness_rating) * 10) / 10
          : null,
        avg_staff: reviewStats._avg.staff_rating
          ? Math.round(Number(reviewStats._avg.staff_rating) * 10) / 10
          : null,
        avg_wait_time: reviewStats._avg.wait_time_rating
          ? Math.round(Number(reviewStats._avg.wait_time_rating) * 10) / 10
          : null,
        avg_value: reviewStats._avg.value_rating
          ? Math.round(Number(reviewStats._avg.value_rating) * 10) / 10
          : null,
        distribution: distribution.reduce(
          (acc, d) => { acc[d.overall_rating] = d._count.id; return acc; },
          {} as Record<number, number>,
        ),
        recent: recentReviews,
      },
    };
  }

  // ── GET /public/directory/:clinicId/reviews — paginated reviews ──
  @Get(':clinicId/reviews')
  @Public()
  @ApiOperation({ summary: 'Get paginated reviews for a clinic' })
  async getClinicReviews(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Query() query: ReviewSortQuery,
  ) {
    const { sort = 'recent', page = 1, limit = 10 } = query;

    const orderBy =
      sort === 'highest' ? { overall_rating: 'desc' as const }
      : sort === 'lowest' ? { overall_rating: 'asc' as const }
      : { created_at: 'desc' as const };

    const [data, total] = await Promise.all([
      this.prisma.clinicDirectoryReview.findMany({
        where: { clinic_id: clinicId, is_visible: true },
        select: {
          id: true,
          reviewer_name: true,
          overall_rating: true,
          cleanliness_rating: true,
          staff_rating: true,
          wait_time_rating: true,
          value_rating: true,
          comment: true,
          is_verified: true,
          created_at: true,
          doctor: { select: { name: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.clinicDirectoryReview.count({
        where: { clinic_id: clinicId, is_visible: true },
      }),
    ]);

    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  // ── POST /public/directory/review/:token — submit a review via token link ──
  @Post('review/:token')
  @Public()
  @ApiOperation({ summary: 'Submit a clinic review using a one-time token' })
  async submitReview(
    @Param('token') token: string,
    @Body() dto: SubmitReviewDto,
  ) {
    if (!token || token.length > 64) throw new BadRequestException('Invalid token');

    const existing = await this.prisma.clinicDirectoryReview.findUnique({
      where: { token },
      select: { id: true, token_used_at: true, clinic_id: true },
    });

    if (!existing) throw new NotFoundException('Review link not found or expired');
    if (existing.token_used_at) throw new BadRequestException('This review link has already been used');

    const review = await this.prisma.clinicDirectoryReview.update({
      where: { token },
      data: {
        reviewer_name: dto.reviewer_name,
        overall_rating: dto.overall_rating,
        cleanliness_rating: dto.cleanliness_rating,
        staff_rating: dto.staff_rating,
        wait_time_rating: dto.wait_time_rating,
        value_rating: dto.value_rating,
        comment: dto.comment,
        token_used_at: new Date(),
        is_verified: true,
      },
      select: { id: true, clinic_id: true, overall_rating: true },
    });

    return { success: true, message: 'Thank you for your review!', review_id: review.id };
  }

  // ── Internal helper used by appointment completion flow ──
  async createReviewToken(
    clinicId: string,
    appointmentId: string,
    doctorId?: string,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.clinicDirectoryReview.create({
      data: {
        clinic_id: clinicId,
        doctor_id: doctorId ?? null,
        appointment_id: appointmentId,
        token,
        reviewer_name: '',
        overall_rating: 0,
      },
    });
    return token;
  }
}
