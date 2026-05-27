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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicDirectoryController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_2 = require("@nestjs/swagger");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const throttler_1 = require("@nestjs/throttler");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const crypto_1 = require("crypto");
class DirectorySearchQuery {
    lat;
    lng;
    city;
    specialty;
    q;
    page;
    limit;
    availableToday;
    radius;
    sort;
    country;
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'User latitude for geo search' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DirectorySearchQuery.prototype, "lat", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'User longitude for geo search' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DirectorySearchQuery.prototype, "lng", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Search by city name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], DirectorySearchQuery.prototype, "city", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Filter by specialty' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], DirectorySearchQuery.prototype, "specialty", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Free text search (clinic name, doctor name)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], DirectorySearchQuery.prototype, "q", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], DirectorySearchQuery.prototype, "page", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ default: 12 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(48),
    __metadata("design:type", Number)
], DirectorySearchQuery.prototype, "limit", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Only return clinics open today with available slots' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === '1' || value === true),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DirectorySearchQuery.prototype, "availableToday", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Radius in km — only return clinics within this distance (requires lat+lng)', example: 25 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Number)
], DirectorySearchQuery.prototype, "radius", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Sort order', enum: ['relevance', 'rating', 'distance', 'reviews'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['relevance', 'rating', 'distance', 'reviews']),
    __metadata("design:type", String)
], DirectorySearchQuery.prototype, "sort", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Filter by country (case-insensitive exact match against clinic country field)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], DirectorySearchQuery.prototype, "country", void 0);
class SubmitReviewDto {
    reviewer_name;
    overall_rating;
    cleanliness_rating;
    staff_rating;
    wait_time_rating;
    value_rating;
    comment;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Priya Sharma' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], SubmitReviewDto.prototype, "reviewer_name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 5 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitReviewDto.prototype, "overall_rating", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitReviewDto.prototype, "cleanliness_rating", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitReviewDto.prototype, "staff_rating", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 4 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitReviewDto.prototype, "wait_time_rating", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitReviewDto.prototype, "value_rating", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'Great experience!' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], SubmitReviewDto.prototype, "comment", void 0);
class ReviewSortQuery {
    sort;
    page;
    limit;
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ enum: ['recent', 'highest', 'lowest'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['recent', 'highest', 'lowest']),
    __metadata("design:type", String)
], ReviewSortQuery.prototype, "sort", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ReviewSortQuery.prototype, "page", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ default: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], ReviewSortQuery.prototype, "limit", void 0);
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getISTContext() {
    const now = new Date();
    const istMs = now.getTime() + 330 * 60 * 1000;
    const istDate = new Date(istMs);
    const istMinutes = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
    const jsDay = istDate.getUTCDay();
    const schemaDay = jsDay === 0 ? 7 : jsDay;
    const todayStart = new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()));
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    return { istMinutes, schemaDay, todayStart, todayEnd };
}
function timeToMins(t) {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}
function fmt12h(t) {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
}
function computeClinicAvailability(branches, schemaDay, istMinutes, bookedToday) {
    let bestBranch = null;
    let bestTotalSlots = -1;
    for (const b of branches) {
        if (!b.working_days || !b.working_start_time || !b.working_end_time)
            continue;
        const days = b.working_days.split(',').map((d) => parseInt(d.trim(), 10));
        if (!days.includes(schemaDay))
            continue;
        const startMin = timeToMins(b.working_start_time);
        const endMin = timeToMins(b.working_end_time);
        let workMins = endMin - startMin;
        if (workMins <= 0)
            continue;
        if (b.lunch_start_time && b.lunch_end_time) {
            const lunchMins = timeToMins(b.lunch_end_time) - timeToMins(b.lunch_start_time);
            workMins -= Math.max(0, lunchMins);
        }
        const slotMin = Math.max(1, (b.slot_duration ?? 15) + (b.buffer_minutes ?? 0));
        const total = Math.max(0, Math.floor(workMins / slotMin));
        if (total > bestTotalSlots) {
            bestTotalSlots = total;
            bestBranch = b;
        }
    }
    if (!bestBranch) {
        return {
            available_today: false, open_now: false,
            opens_at: null, closes_at: null,
            total_slots_today: null, available_slots_today: null,
        };
    }
    const startMin = timeToMins(bestBranch.working_start_time);
    const endMin = timeToMins(bestBranch.working_end_time);
    const openNow = istMinutes >= startMin && istMinutes < endMin;
    const availableSlots = Math.max(0, bestTotalSlots - bookedToday);
    return {
        available_today: true,
        open_now: openNow,
        opens_at: fmt12h(bestBranch.working_start_time),
        closes_at: fmt12h(bestBranch.working_end_time),
        total_slots_today: bestTotalSlots,
        available_slots_today: availableSlots,
    };
}
let PublicDirectoryController = class PublicDirectoryController {
    prisma;
    s3;
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
    }
    async searchClinics(query, res) {
        const { lat, lng, city, specialty, q, country, page = 1, limit = 12, availableToday, radius, sort = 'relevance' } = query;
        const isSimpleList = !q && !availableToday && !lat && !lng && !specialty && !city && !country;
        if (isSimpleList) {
            res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
        }
        const andConditions = [];
        if (city) {
            andConditions.push({ city: { contains: city, mode: 'insensitive' } });
        }
        if (specialty) {
            andConditions.push({
                OR: [
                    { specialties: { contains: specialty, mode: 'insensitive' } },
                    { directory_treatments: { contains: specialty, mode: 'insensitive' } },
                ],
            });
        }
        if (country) {
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
                    { name: { contains: q, mode: 'insensitive' } },
                    { city: { contains: q, mode: 'insensitive' } },
                    { specialties: { contains: q, mode: 'insensitive' } },
                    { directory_treatments: { contains: q, mode: 'insensitive' } },
                ],
            });
        }
        const where = {
            listed_in_directory: true,
            is_suspended: false,
            ...(andConditions.length ? { AND: andConditions } : {}),
        };
        const clinics = await this.prisma.clinic.findMany({
            where: where,
            take: 500,
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
        let enriched = clinics.map((c) => {
            const reviews = c.directory_reviews;
            const avg = reviews.length
                ? reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length
                : null;
            const distKm = lat != null && lng != null && c.latitude && c.longitude
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
                available_today: avail.available_today,
                open_now: avail.open_now,
                opens_at: avail.opens_at,
                closes_at: avail.closes_at,
                total_slots_today: avail.total_slots_today,
                available_slots_today: avail.available_slots_today,
            };
        });
        if (availableToday) {
            enriched = enriched.filter((c) => c.available_today);
        }
        if (lat != null && lng != null && radius != null) {
            enriched = enriched.filter((c) => c.distance_km != null && c.distance_km <= radius);
        }
        if (sort === 'rating') {
            enriched.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
        }
        else if (sort === 'reviews') {
            enriched.sort((a, b) => b.review_count - a.review_count);
        }
        else if (sort === 'distance' || (lat != null && lng != null)) {
            enriched.sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
        }
        const total = enriched.length;
        const skip = (page - 1) * limit;
        const paginated = enriched.slice(skip, skip + limit);
        return {
            data: paginated,
            meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
        };
    }
    async getClinicDetail(clinicId) {
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
        if (!clinic)
            throw new common_1.NotFoundException('Clinic not found or not publicly listed');
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
        const distribution = await this.prisma.clinicDirectoryReview.groupBy({
            by: ['overall_rating'],
            where: { clinic_id: clinicId, is_visible: true },
            _count: { id: true },
        });
        const branches = await Promise.all(clinic.branches.map(async (b) => {
            const signedPhoto = b.photo_url
                ? await this.s3.getSignedUrl(b.photo_url).catch(() => null)
                : null;
            return { ...b, photo_url: signedPhoto };
        }));
        const doctors = await Promise.all(clinic.users.map(async (d) => {
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
        }));
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
                distribution: distribution.reduce((acc, d) => { acc[d.overall_rating] = d._count.id; return acc; }, {}),
                recent: recentReviews,
            },
        };
    }
    async getClinicReviews(clinicId, query) {
        const { sort = 'recent', page = 1, limit = 10 } = query;
        const orderBy = sort === 'highest' ? { overall_rating: 'desc' }
            : sort === 'lowest' ? { overall_rating: 'asc' }
                : { created_at: 'desc' };
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
    async submitReview(token, dto) {
        if (!token || token.length > 64)
            throw new common_1.BadRequestException('Invalid token');
        const existing = await this.prisma.clinicDirectoryReview.findUnique({
            where: { token },
            select: { id: true, token_used_at: true, clinic_id: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('Review link not found or expired');
        if (existing.token_used_at)
            throw new common_1.BadRequestException('This review link has already been used');
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
    async createReviewToken(clinicId, appointmentId, doctorId) {
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
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
};
exports.PublicDirectoryController = PublicDirectoryController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Search publicly listed dental clinics' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DirectorySearchQuery, Object]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "searchClinics", null);
__decorate([
    (0, common_1.Get)(':clinicId'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get full clinic detail page data' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "getClinicDetail", null);
__decorate([
    (0, common_1.Get)(':clinicId/reviews'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get paginated reviews for a clinic' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('clinicId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ReviewSortQuery]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "getClinicReviews", null);
__decorate([
    (0, common_1.Post)('review/:token'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a clinic review using a one-time token' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SubmitReviewDto]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "submitReview", null);
exports.PublicDirectoryController = PublicDirectoryController = __decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, swagger_1.ApiTags)('Public Directory'),
    (0, common_1.Controller)('public/directory'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        s3_service_js_1.S3Service])
], PublicDirectoryController);
//# sourceMappingURL=public-directory.controller.js.map