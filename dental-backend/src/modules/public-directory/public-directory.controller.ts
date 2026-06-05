import {
  Controller, Get, Post, Param, Body, Query, Res, UploadedFile, UseInterceptors,
  ParseUUIDPipe, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ListingVerificationService,
  LISTING_VERIFICATION_MAX_BYTES,
} from './listing-verification.service.js';
import { ListingOtpService } from './listing-otp.service.js';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsInt, IsNumber, IsBoolean, Min, Max, MinLength,
  MaxLength, IsIn, IsEmail, IsArray, ArrayMaxSize, IsNotEmpty, Equals,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '@prisma/client';
import { S3Service } from '../../common/services/s3.service.js';
import { randomBytes, randomInt } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { normalizePhoneE164 } from '../../common/utils/phone.util.js';
import { EmailProvider } from '../communication/providers/email.provider.js';

const PLATFORM_CLINIC_ID = '__platform__';

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

// ─── List-Practice DTOs ─────────────────────────────────────────────────────

class SendPhoneOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;
}

class VerifyPhoneOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

class SendEmailOtpDto {
  @ApiProperty({ example: 'dr.sharma@clinic.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Phone verification token from verify-phone-otp step' })
  @IsString()
  @IsNotEmpty()
  phone_token!: string;
}

class VerifyEmailOtpDto {
  @ApiProperty({ example: 'dr.sharma@clinic.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '293847' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}

class SubmitListingDto {
  @ApiProperty({ description: 'Phone verification JWT from verify-phone-otp' })
  @IsString()
  @IsNotEmpty()
  phone_token!: string;

  @ApiProperty({ description: 'Email verification JWT from verify-email-otp' })
  @IsString()
  @IsNotEmpty()
  email_token!: string;

  @ApiProperty({ description: 'Must be true — submitter accepted Terms of Service and Privacy Policy' })
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @Equals(true, { message: 'You must accept the Terms of Service and Privacy Policy.' })
  accepted_terms!: boolean;

  // Step 1
  @ApiProperty({ example: 'Sharma Dental Clinic' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  clinic_name!: string;

  @ApiProperty({ example: 'Dr. Rajesh Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contact_name!: string;

  // Step 2
  @ApiProperty({ example: '12, MG Road, Koramangala' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address!: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state!: string;

  @ApiPropertyOptional({ example: '560034' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({ example: 'https://maps.app.goo.gl/...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  google_maps_url?: string;

  @ApiPropertyOptional({ description: 'Latitude from browser geolocation', example: 12.9716 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude from browser geolocation', example: 77.5946 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  // Step 3
  @ApiPropertyOptional({ example: ['General Dentistry', 'Orthodontics'] })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return value;
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ example: ['Root Canal', 'Teeth Whitening', 'Braces'] })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return value;
  })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  treatments?: string[];

  @ApiPropertyOptional({ example: 'Mon–Sat 9am–7pm' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  working_hours_label?: string;

  @ApiPropertyOptional({ example: 'English, Hindi, Kannada' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  languages_spoken?: string;

  @ApiPropertyOptional({ example: 'https://drsharmadental.com' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website_url?: string;

  @ApiPropertyOptional({ example: 'Family dental clinic with 15 years of experience.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  clinic_description?: string;

  @ApiPropertyOptional({
    description: 'Type of proof-of-practice document (optional — speeds up review)',
    enum: ['clinic_photo', 'prescription_pad', 'invoice', 'other'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['clinic_photo', 'prescription_pad', 'invoice', 'other'])
  verification_document_type?: 'clinic_photo' | 'prescription_pad' | 'invoice' | 'other';

  @ApiPropertyOptional({ description: 'JWT from pending-verification upload (preferred over re-uploading the file)' })
  @IsOptional()
  @IsString()
  verification_upload_token?: string;
}

class StagePendingVerificationDto {
  @ApiProperty({ enum: ['clinic_photo', 'prescription_pad', 'invoice', 'other'] })
  @IsString()
  @IsIn(['clinic_photo', 'prescription_pad', 'invoice', 'other'])
  verification_document_type!: 'clinic_photo' | 'prescription_pad' | 'invoice' | 'other';
}

class DiscardPendingVerificationDto {
  @ApiProperty({ description: 'JWT returned by pending-verification upload' })
  @IsString()
  @IsNotEmpty()
  upload_token!: string;
}

// ─── City alias normalization ────────────────────────────────────────────────
// Strips trailing ", State/Country" geocoder suffixes and expands known
// dual-name cities so a search for "Bengaluru" also matches "Bangalore".
const CITY_ALIASES: Record<string, string[]> = {
  bengaluru:  ['bengaluru', 'bangalore'],
  bangalore:  ['bengaluru', 'bangalore'],
  mumbai:     ['mumbai', 'bombay'],
  bombay:     ['mumbai', 'bombay'],
  chennai:    ['chennai', 'madras'],
  madras:     ['chennai', 'madras'],
  kolkata:    ['kolkata', 'calcutta'],
  calcutta:   ['kolkata', 'calcutta'],
  pune:       ['pune', 'poona'],
  poona:      ['pune', 'poona'],
  kochi:      ['kochi', 'cochin', 'ernakulam'],
  cochin:     ['kochi', 'cochin', 'ernakulam'],
  ernakulam:  ['kochi', 'cochin', 'ernakulam'],
  varanasi:   ['varanasi', 'banaras', 'benares'],
};

function expandCitySearch(raw: string): string[] {
  // Strip geocoder suffix like ", Karnataka" or ", India"
  const city = raw.split(',')[0].trim().toLowerCase();
  return CITY_ALIASES[city] ?? [city];
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

// Staff with listed_in_directory=true are shown publicly (UI only exposes this toggle for doctors).
const PUBLIC_DOCTOR_WHERE = {
  status: 'active',
  listed_in_directory: true,
} as const;

// ─── Controller ─────────────────────────────────────────────────────────────

@SkipThrottle()
@ApiTags('Public Directory')
@Controller('public/directory')
export class PublicDirectoryController {
  private readonly logger = new (class { log = (m: string) => console.log(`[PublicDirectory] ${m}`); warn = (m: string) => console.warn(`[PublicDirectory] ${m}`); })();

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly listingVerification: ListingVerificationService,
    private readonly listingOtp: ListingOtpService,
    private readonly emailProvider: EmailProvider,
  ) {}

  /** Reuse a cached SMTP connection — avoids first-send timeouts from cold handshakes. */
  private ensurePlatformEmail(): boolean {
    if (this.emailProvider.isConfigured(PLATFORM_CLINIC_ID)) return true;
    const host = this.config.get<string>('app.smtp.host');
    const user = this.config.get<string>('app.smtp.user');
    if (!host || !user) return false;
    this.emailProvider.configure(PLATFORM_CLINIC_ID, {
      host,
      port: this.config.get<number>('app.smtp.port') || 587,
      user,
      pass: this.config.get<string>('app.smtp.pass') || '',
      from: this.config.get<string>('app.smtp.from') || user,
      secure: this.config.get<boolean>('app.smtp.secure') || false,
    }, 'smtp-env');
    return true;
  }

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
    // Each filter is pushed as an AND condition so they compose safely without
    // overwriting each other's OR arrays.
    const andConditions: object[] = [];

    if (city) {
      const variants = expandCitySearch(city);
      andConditions.push({
        OR: variants.map((v) => ({ city: { contains: v, mode: 'insensitive' } })),
      });
    }

    if (specialty) {
      // Match against both the high-level specialties field AND the directory_treatments
      // list (e.g. "Teeth Whitening" lives in treatments, not specialties)
      andConditions.push({
        OR: [
          { specialties:          { contains: specialty, mode: 'insensitive' } },
          { directory_treatments: { contains: specialty, mode: 'insensitive' } },
        ],
      });
    }

    if (country) {
      // Show clinics that match OR have no country set (not yet filled in)
      andConditions.push({
        OR: [
          { country: { equals: country, mode: 'insensitive' } },
          { country: null },
        ],
      });
    }

    if (q) {
      andConditions.push({
        OR: [
          { name:               { contains: q, mode: 'insensitive' } },
          { city:               { contains: q, mode: 'insensitive' } },
          { specialties:        { contains: q, mode: 'insensitive' } },
          { directory_treatments:{ contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Record<string, unknown> = {
      listed_in_directory: true,
      is_suspended: false,
      ...(andConditions.length ? { AND: andConditions } : {}),
    };

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
          where: PUBLIC_DOCTOR_WHERE,
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
        lat: c.latitude ?? null,
        lng: c.longitude ?? null,
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

  // ── GET /public/directory/sitemap — lightweight clinic list for sitemap.xml ──
  // Declared before :clinicId so the static "sitemap" segment matches first.
  // Returns every directory-listed clinic (no page-size cap, cheap select) so
  // the frontend sitemap can include all clinic profile URLs.
  @Get('sitemap')
  @Public()
  @ApiOperation({ summary: 'List all directory-listed clinics (id + updated_at) for sitemap generation' })
  async listForSitemap(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    const clinics = await this.prisma.clinic.findMany({
      where: { listed_in_directory: true, is_suspended: false },
      select: { id: true, updated_at: true },
      orderBy: { created_at: 'desc' },
    });
    // Return a bare array — the global response interceptor wraps it as
    // { success, data: [...] }, so the consumer reads it at `data`.
    return clinics;
  }

  // ── GET /public/directory/featured — homepage carousel (super-admin curated) ──
  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'List featured directory clinics for the patient homepage' })
  async getFeaturedClinics(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    const clinics = await this.prisma.clinic.findMany({
      where: {
        listed_in_directory: true,
        is_suspended: false,
        directory_featured: true,
      },
      orderBy: [{ directory_featured_order: 'asc' }, { name: 'asc' }],
      take: 12,
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
          where: PUBLIC_DOCTOR_WHERE,
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
    });

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

    return clinics.map((c) => {
      const reviews = c.directory_reviews;
      const avg = reviews.length
        ? reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length
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
        available_today: avail.available_today,
        open_now: avail.open_now,
      };
    });
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
          where: PUBLIC_DOCTOR_WHERE,
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

  // ── GET /public/directory/review/:token — fetch clinic info for the review form ──
  @Get('review/:token')
  @Public()
  @ApiOperation({ summary: 'Get clinic info for a review token (used to display clinic name on the form)' })
  async getReviewToken(@Param('token') token: string) {
    if (!token || token.length > 64) throw new BadRequestException('Invalid token');

    const review = await this.prisma.clinicDirectoryReview.findUnique({
      where: { token },
      select: {
        id: true,
        token_used_at: true,
        clinic: { select: { id: true, name: true, city: true } },
        doctor: { select: { name: true } },
        patient: { select: { first_name: true, last_name: true } },
      },
    });

    if (!review) throw new NotFoundException('Review link not found or expired');
    if (review.token_used_at) throw new BadRequestException('This review link has already been used');

    const patientName = review.patient
      ? `${review.patient.first_name} ${review.patient.last_name ?? ''}`.trim()
      : null;

    return {
      clinic_name: review.clinic.name,
      clinic_city: review.clinic.city ?? null,
      doctor_name: review.doctor?.name ?? null,
      patient_name: patientName,
    };
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
        approval_status: 'submitted',
        // Force hidden until a clinic admin approves. Tokens created before the
        // approval feature shipped defaulted is_visible=true, so we must reset it
        // here or those reviews would go public without approval.
        is_visible: false,
      },
      select: { id: true, clinic_id: true, overall_rating: true },
    });

    // Notify clinic admins so they can approve the review
    this.notifyClinicOfNewReview(review.clinic_id, review.id, review.overall_rating).catch(() => {});

    return { success: true, message: 'Thank you for your review! It will appear on the clinic\'s profile once approved.', review_id: review.id };
  }

  // ── POST /public/directory/list-practice/send-phone-otp ──────────────────
  @Post('list-practice/send-phone-otp')
  @Public()
  @ApiOperation({ summary: 'Send SMS OTP to phone for free listing verification' })
  async sendListingPhoneOtp(@Body() dto: SendPhoneOtpDto) {
    const phone = dto.phone.trim();
    const phoneKey = await this.listingOtp.assertPhoneSendAllowed(phone);
    const otp = String(randomInt(100000, 999999));

    const apiKey = this.config.get<string>('app.sms.apiKey');
    const templateId = this.config.get<string>('app.sms.defaultDltTemplateId');

    if (!apiKey || !templateId) {
      this.logger.warn('Platform SMS not configured — listing phone OTP not sent');
      await this.listingOtp.storePhoneOtp(phoneKey, otp);
      return { message: 'OTP generated. (SMS not configured on server)' };
    }

    const senderId = this.config.get<string>('app.sms.senderId') || 'SDDSK';
    const entityId = this.config.get<string>('app.sms.entityId') || '';
    const templateBody =
      this.config.get<string>('app.sms.dltTemplateBody') ||
      "Your otp for {#var#} by grats it is {#var#}, otp valid for 10min, please don't share with any one,";

    let slot = 0;
    const text = templateBody.replace(/\{#var#\}/g, () => {
      slot++;
      if (slot === 1) return 'listing your practice on Smart Dental Desk';
      if (slot === 2) return otp;
      return '';
    });

    const digits = phone.replace(/[^0-9]/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;

    const params = new URLSearchParams({
      APIKey: apiKey,
      senderid: senderId,
      channel: '2',
      DCS: '0',
      flashsms: '0',
      number,
      text,
      route: '47',
      dlttemplateid: templateId,
    });
    if (entityId) params.set('EntityId', entityId);

    let smsErr: string | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`https://www.smsgatewayhub.com/api/mt/SendSMS?${params.toString()}`, {
          signal: AbortSignal.timeout(45_000),
        });
        const data = await res.json() as Record<string, unknown>;
        const ok = data['ErrorCode'] === '000' || data['ErrorCode'] === 0;
        if (!ok) {
          smsErr = String(data['ErrorMessage'] ?? 'SMS gateway error');
          this.logger.warn(`Listing phone OTP attempt ${attempt} failed to ${number}: ${smsErr}`);
        } else {
          this.logger.log(`Listing phone OTP sent to ${number} (attempt ${attempt})`);
          smsErr = undefined;
          break;
        }
      } catch (err) {
        smsErr = err instanceof Error ? err.message : 'SMS gateway timeout';
        this.logger.warn(`Listing phone OTP attempt ${attempt} failed to ${number}: ${smsErr}`);
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
    }

    if (smsErr) {
      await this.listingOtp.rollbackPhoneSend(phoneKey);
      throw new BadRequestException('Could not send SMS OTP. Please try again.');
    }

    await this.listingOtp.storePhoneOtp(phoneKey, otp);
    return { message: 'OTP sent to your mobile number. Valid for 10 minutes.' };
  }

  // ── POST /public/directory/list-practice/verify-phone-otp ─────────────────
  @Post('list-practice/verify-phone-otp')
  @Public()
  @ApiOperation({ summary: 'Verify phone OTP for free listing; returns a short-lived phone token' })
  async verifyListingPhoneOtp(@Body() dto: VerifyPhoneOtpDto) {
    const phoneKey = this.listingOtp.normalizePhoneKey(dto.phone);
    await this.listingOtp.verifyPhoneOtp(phoneKey, dto.code.trim());
    const token = await this.jwt.signAsync(
      { phone: phoneKey, type: 'listing_phone_verified' },
      { expiresIn: '60m' },
    );
    return { verified: true, token, message: 'Phone verified successfully.' };
  }

  // ── POST /public/directory/list-practice/send-email-otp ───────────────────
  @Post('list-practice/send-email-otp')
  @Public()
  @ApiOperation({ summary: 'Send email OTP for free listing (requires phone_token)' })
  async sendListingEmailOtp(@Body() dto: SendEmailOtpDto) {
    // Validate that phone was already verified
    try {
      const payload = await this.jwt.verifyAsync<{ phone: string; type: string }>(dto.phone_token);
      if (payload.type !== 'listing_phone_verified') throw new Error('wrong type');
    } catch {
      throw new BadRequestException('Invalid or expired phone verification token. Please verify your phone first.');
    }

    const emailKey = await this.listingOtp.assertEmailSendAllowed(dto.email);
    const otp = String(randomInt(100000, 999999));

    if (!this.ensurePlatformEmail()) {
      this.logger.warn('Platform SMTP not configured — listing email OTP not sent');
      await this.listingOtp.storeEmailOtp(emailKey, otp);
      return { message: 'OTP generated. (Email not configured on server)' };
    }

    const fromAddr =
      this.config.get<string>('app.smtp.from')
      || this.config.get<string>('app.smtp.user')
      || 'noreply@smartdentaldesk.com';
    const html = `
          <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="font-size:20px;font-weight:700;color:#1a78d6;">Smart</span>
              <span style="font-size:20px;font-weight:700;color:#1ec991;margin-left:4px;">Dental Desk</span>
            </div>
            <h2 style="font-size:18px;font-weight:600;color:#111827;text-align:center;margin:0 0 8px;">Verify your email address</h2>
            <p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 28px;">Enter this code to verify your email for your free practice listing.</p>
            <div style="background:#f3f4f6;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#111827;">${otp}</span>
            </div>
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">This code expires in 10 minutes. Do not share it with anyone.</p>
          </div>
        `;

    let lastErr: string | undefined;
    for (let attempt = 1; attempt <= 4; attempt++) {
      const result = await this.emailProvider.send({
        clinicId: PLATFORM_CLINIC_ID,
        to: emailKey,
        subject: `${otp} — Your verification code for Smart Dental Desk listing`,
        body: `Your Smart Dental Desk listing verification code is ${otp}. Valid for 10 minutes.`,
        html,
        metadata: { from: `"Smart Dental Desk" <${fromAddr}>` },
      });
      if (result.success) {
        this.logger.log(`Listing email OTP sent to ${emailKey} (attempt ${attempt})`);
        lastErr = undefined;
        break;
      }
      lastErr = result.error ?? 'Unknown email error';
      this.logger.warn(`Listing email OTP attempt ${attempt} failed to ${emailKey}: ${lastErr}`);
      if (attempt < 4) await new Promise((r) => setTimeout(r, 3000));
    }

    if (lastErr) {
      await this.listingOtp.rollbackEmailSend(emailKey);
      throw new BadRequestException('Could not send email OTP. Please try again.');
    }

    await this.listingOtp.storeEmailOtp(emailKey, otp);
    return { message: 'OTP sent to your email address. Valid for 10 minutes.' };
  }

  // ── POST /public/directory/list-practice/verify-email-otp ─────────────────
  @Post('list-practice/verify-email-otp')
  @Public()
  @ApiOperation({ summary: 'Verify email OTP for free listing; returns a short-lived email token' })
  async verifyListingEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    const emailKey = this.listingOtp.normalizeEmailKey(dto.email);
    await this.listingOtp.verifyEmailOtp(emailKey, dto.code.trim());
    const token = await this.jwt.signAsync(
      { email: emailKey, type: 'listing_email_verified' },
      { expiresIn: '60m' },
    );
    return { verified: true, token, message: 'Email verified successfully.' };
  }

  // ── POST /public/directory/list-practice/pending-verification ─────────────
  @Post('list-practice/pending-verification')
  @Public()
  @ApiOperation({ summary: 'Stage a verification document before OTP steps (cleaned up if listing is abandoned)' })
  @UseInterceptors(FileInterceptor('verification_document', { limits: { fileSize: LISTING_VERIFICATION_MAX_BYTES } }))
  async stagePendingVerification(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: StagePendingVerificationDto,
  ) {
    return this.listingVerification.stagePendingUpload(file, dto.verification_document_type);
  }

  // ── DELETE /public/directory/list-practice/pending-verification ───────────
  @Post('list-practice/discard-pending-verification')
  @Public()
  @ApiOperation({ summary: 'Remove a staged verification document when the user abandons or replaces it' })
  async discardPendingVerification(@Body() dto: DiscardPendingVerificationDto) {
    return this.listingVerification.discardPendingUpload(dto.upload_token);
  }

  // ── POST /public/directory/list-practice/submit ───────────────────────────
  @Post('list-practice/submit')
  @Public()
  @ApiOperation({ summary: 'Submit a free practice listing after phone + email verification' })
  @UseInterceptors(FileInterceptor('verification_document', { limits: { fileSize: LISTING_VERIFICATION_MAX_BYTES } }))
  async submitListing(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: SubmitListingDto,
  ) {
    let docKey: string | null = null;
    let docType: string | null = null;
    let stagedUploadId: string | null = null;

    if (dto.verification_upload_token) {
      const staged = await this.listingVerification.resolveStagedUpload(
        dto.verification_upload_token,
        dto.verification_document_type,
      );
      docKey = staged.s3_key;
      docType = staged.document_type;
      stagedUploadId = staged.id;
    } else if (file) {
      if (!dto.verification_document_type) {
        throw new BadRequestException('Please select a document type when uploading a verification file.');
      }
      docKey = await this.listingVerification.uploadAndTrack(file, dto.verification_document_type);
      docType = dto.verification_document_type;
    }

    // Validate phone token
    let verifiedPhone: string;
    try {
      const payload = await this.jwt.verifyAsync<{ phone: string; type: string }>(dto.phone_token);
      if (payload.type !== 'listing_phone_verified') throw new Error('wrong type');
      verifiedPhone = payload.phone;
    } catch {
      throw new BadRequestException('Invalid or expired phone verification token.');
    }

    let verifiedEmail: string;
    try {
      const payload = await this.jwt.verifyAsync<{ email: string; type: string }>(dto.email_token);
      if (payload.type !== 'listing_email_verified') throw new Error('wrong type');
      verifiedEmail = payload.email;
    } catch {
      throw new BadRequestException('Invalid or expired email verification token.');
    }

    // Block if a full dashboard account already exists with this email or phone
    const siteUrl = this.config.get<string>('app.frontendUrl') || 'https://smartdentaldesk.com';
    const existingUser = await this.prisma.user.findFirst({
      where: {
        status: 'active',
        OR: [{ email: verifiedEmail }, { phone: verifiedPhone }],
      },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException(
        `A clinic account already exists with this mobile or email. Please login at ${siteUrl}/login to manage or update your listing.`,
      );
    }

    // Check for duplicate submission (same phone or email in last 24h for directory-only clinics)
    const existing = await this.prisma.clinic.findFirst({
      where: {
        is_directory_only: true,
        OR: [{ phone: verifiedPhone }, { email: verifiedEmail }],
      },
      select: { id: true, directory_approval_status: true },
    });

    if (existing) {
      if (existing.directory_approval_status === 'pending') {
        return { success: true, message: 'Your listing is already under review. We will notify you once it is approved.' };
      }
      if (existing.directory_approval_status === 'approved') {
        return { success: true, message: 'Your practice is already listed in our directory.' };
      }
      // Previously rejected — block duplicate clinic rows; ask them to contact support or re-apply after correction
      if (existing.directory_approval_status === 'rejected') {
        throw new BadRequestException(
          'A previous listing request with this email or phone was rejected. Please contact support@smartdentaldesk.com to re-apply.',
        );
      }
    }

    let clinic: { id: string; name: string };
    try {
      clinic = await this.prisma.clinic.create({
        data: {
          name: dto.clinic_name.trim(),
          email: verifiedEmail,
          phone: normalizePhoneE164(verifiedPhone) ?? verifiedPhone,
          address: dto.address.trim(),
          city: dto.city.trim(),
          state: dto.state.trim(),
          country: 'India',
          pincode: dto.pincode?.trim() ?? null,
          google_maps_url: dto.google_maps_url?.trim() ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          specialties: dto.specialties?.join(',') ?? null,
          directory_treatments: dto.treatments?.join(',') ?? null,
          working_hours_label: dto.working_hours_label?.trim() ?? null,
          languages_spoken: dto.languages_spoken?.trim() ?? null,
          website_url: dto.website_url?.trim() ?? null,
          clinic_description: dto.clinic_description?.trim() ?? null,
          directory_verification_document_url: docKey,
          directory_verification_document_type: docType,
          // Directory flags
          is_directory_only: true,
          directory_contact_name: dto.contact_name.trim(),
          directory_approval_status: 'pending',
          directory_requested_at: new Date(),
          directory_terms_accepted_at: new Date(),
          listed_in_directory: false,
          // Minimal subscription state — directory-only clinics have no app access
          subscription_status: 'directory',
        },
        select: { id: true, name: true },
      });
    } catch (err) {
      if (!stagedUploadId && docKey) {
        await this.listingVerification.discardOrphanKey(docKey);
      }
      throw err;
    }

    // Notify super-admin via email
    this.notifySuperAdmin(clinic.name, dto.contact_name, verifiedPhone, verifiedEmail).catch(() => {});

    this.logger.log(`Free listing submitted: clinic ${clinic.id} (${clinic.name}) — pending approval`);

    return {
      success: true,
      clinic_id: clinic.id,
      message: 'Your listing has been submitted for review. We will notify you at your email once it is approved (usually within 24 hours).',
    };
  }

  private async notifySuperAdmin(clinicName: string, contactName: string, phone: string, email: string) {
    const host = this.config.get<string>('app.smtp.host');
    const user = this.config.get<string>('app.smtp.user');
    const pass = this.config.get<string>('app.smtp.pass') || '';
    const fromAddr = this.config.get<string>('app.smtp.from') || user || 'noreply@smartdentaldesk.com';
    const port = this.config.get<number>('app.smtp.port') || 587;
    const secure = this.config.get<boolean>('app.smtp.secure') || false;
    const siteUrl = this.config.get<string>('app.frontendUrl') || 'https://smartdentaldesk.com';

    if (!host || !user) return;

    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      ...(!secure && { tls: { rejectUnauthorized: false } }),
    });

    await transporter.sendMail({
      from: `"Smart Dental Desk" <${fromAddr}>`,
      to: fromAddr,
      subject: `New free listing request: ${clinicName}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 16px;">New Free Listing Request</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
            <tr><td style="padding:6px 0;font-weight:600;width:140px;">Clinic</td><td>${clinicName}</td></tr>
            <tr><td style="padding:6px 0;font-weight:600;">Contact</td><td>${contactName}</td></tr>
            <tr><td style="padding:6px 0;font-weight:600;">Phone</td><td>${phone}</td></tr>
            <tr><td style="padding:6px 0;font-weight:600;">Email</td><td>${email}</td></tr>
          </table>
          <div style="margin-top:24px;">
            <a href="${siteUrl}/super-admin/directory-approvals" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review in Dashboard →</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:20px;">Both phone (${phone}) and email (${email}) have been OTP-verified.</p>
        </div>
      `,
    });
  }

  // ── Notify clinic admins when a patient submits a review ──
  private async notifyClinicOfNewReview(clinicId: string, reviewId: string, rating: number) {
    const admins = await this.prisma.user.findMany({
      where: { clinic_id: clinicId, role: { in: ['Admin', 'SuperAdmin'] }, status: 'active' },
      select: { id: true },
    });
    if (!admins.length) return;

    const stars = rating;
    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        clinic_id: clinicId,
        user_id: admin.id,
        type: 'review_submitted',
        title: 'New patient review awaiting approval',
        body: `A patient left a ${stars}-star review. Go to Reviews to approve or reject it.`,
        metadata: { review_id: reviewId } as Prisma.InputJsonValue,
      })),
    });
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
