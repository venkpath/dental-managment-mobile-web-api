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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicDirectoryController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const listing_verification_service_js_1 = require("./listing-verification.service.js");
const listing_otp_service_js_1 = require("./listing-otp.service.js");
const public_directory_image_utils_js_1 = require("./public-directory-image.utils.js");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_2 = require("@nestjs/swagger");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const throttler_1 = require("@nestjs/throttler");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const nodemailer = __importStar(require("nodemailer"));
const phone_util_js_1 = require("../../common/utils/phone.util.js");
const email_provider_js_1 = require("../communication/providers/email.provider.js");
const directory_reviews_merge_utils_js_1 = require("./directory-reviews-merge.utils.js");
const PLATFORM_CLINIC_ID = '__platform__';
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
class SendPhoneOtpDto {
    phone;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: '+919876543210' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(7),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], SendPhoneOtpDto.prototype, "phone", void 0);
class VerifyPhoneOtpDto {
    phone;
    code;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: '+919876543210' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(7),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], VerifyPhoneOtpDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '482910' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    (0, class_validator_1.MaxLength)(6),
    __metadata("design:type", String)
], VerifyPhoneOtpDto.prototype, "code", void 0);
class SendEmailOtpDto {
    email;
    phone_token;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'dr.sharma@clinic.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendEmailOtpDto.prototype, "email", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Phone verification token from verify-phone-otp step' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendEmailOtpDto.prototype, "phone_token", void 0);
class VerifyEmailOtpDto {
    email;
    code;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'dr.sharma@clinic.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], VerifyEmailOtpDto.prototype, "email", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '293847' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    (0, class_validator_1.MaxLength)(6),
    __metadata("design:type", String)
], VerifyEmailOtpDto.prototype, "code", void 0);
class SubmitListingDto {
    phone_token;
    email_token;
    accepted_terms;
    clinic_name;
    contact_name;
    address;
    city;
    state;
    pincode;
    google_maps_url;
    latitude;
    longitude;
    specialties;
    treatments;
    working_hours_label;
    languages_spoken;
    website_url;
    clinic_description;
    verification_document_type;
    verification_upload_token;
    dentist_photo_upload_token;
    years_experience;
    established_year;
    clinic_image_upload_token;
    working_days;
    working_start_time;
    working_end_time;
}
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Phone verification JWT from verify-phone-otp' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "phone_token", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Email verification JWT from verify-email-otp' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "email_token", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Must be true — submitter accepted Terms of Service and Privacy Policy' }),
    (0, class_transformer_1.Transform)(({ value }) => value === true || value === 'true' || value === '1'),
    (0, class_validator_1.Equals)(true, { message: 'You must accept the Terms of Service and Privacy Policy.' }),
    __metadata("design:type", Boolean)
], SubmitListingDto.prototype, "accepted_terms", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Sharma Dental Clinic' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "clinic_name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Dr. Rajesh Sharma' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "contact_name", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: '12, MG Road, Koramangala' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "address", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Bengaluru' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "city", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Karnataka' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "state", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: '560034' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "pincode", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'https://maps.app.goo.gl/...' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "google_maps_url", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Latitude from browser geolocation', example: 12.9716 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitListingDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'Longitude from browser geolocation', example: 77.5946 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], SubmitListingDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: ['General Dentistry', 'Orthodontics'] }),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value == null || value === '')
            return [];
        if (Array.isArray(value))
            return value.map(String).map((s) => s.trim()).filter(Boolean);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed)
                    ? parsed.map(String).map((s) => s.trim()).filter(Boolean)
                    : [];
            }
            catch {
                return [];
            }
        }
        return value;
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(10),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(2, { each: true }),
    (0, class_validator_1.MaxLength)(80, { each: true }),
    __metadata("design:type", Array)
], SubmitListingDto.prototype, "specialties", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: ['Root Canal', 'Teeth Whitening', 'Braces'] }),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value == null || value === '')
            return [];
        if (Array.isArray(value))
            return value.map(String).map((s) => s.trim()).filter(Boolean);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed)
                    ? parsed.map(String).map((s) => s.trim()).filter(Boolean)
                    : [];
            }
            catch {
                return [];
            }
        }
        return value;
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(30),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MinLength)(2, { each: true }),
    (0, class_validator_1.MaxLength)(80, { each: true }),
    __metadata("design:type", Array)
], SubmitListingDto.prototype, "treatments", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'Mon–Sat 9am–7pm' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "working_hours_label", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'English, Hindi, Kannada' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "languages_spoken", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'https://drsharmadental.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "website_url", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'Family dental clinic with 15 years of experience.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "clinic_description", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({
        description: 'Type of proof-of-practice document (optional — speeds up review)',
        enum: ['clinic_photo', 'prescription_pad', 'invoice', 'other'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['clinic_photo', 'prescription_pad', 'invoice', 'other']),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "verification_document_type", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'JWT from pending-verification upload (preferred over re-uploading the file)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "verification_upload_token", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'JWT from staged dentist profile photo upload (required — use /pending-verification with type=dentist_photo)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "dentist_photo_upload_token", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Dentist years of clinical experience', example: 8 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], SubmitListingDto.prototype, "years_experience", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Year the clinic was established', example: 2015 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    (0, class_validator_1.Max)(new Date().getFullYear()),
    __metadata("design:type", Number)
], SubmitListingDto.prototype, "established_year", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ description: 'JWT from staged clinic cover image upload (use /pending-verification with type=clinic_image)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "clinic_image_upload_token", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({
        description: 'Working day numbers (1=Mon … 7=Sun). Seeded onto branch schedule and doctor availability on approval.',
        example: [1, 2, 3, 4, 5, 6],
    }),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value == null || value === '')
            return [1, 2, 3, 4, 5, 6];
        if (Array.isArray(value))
            return value.map(Number);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed.map(Number) : [1, 2, 3, 4, 5, 6];
            }
            catch {
                return [1, 2, 3, 4, 5, 6];
            }
        }
        return value;
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(7),
    (0, class_validator_1.IsInt)({ each: true }),
    (0, class_validator_1.Min)(1, { each: true }),
    (0, class_validator_1.Max)(7, { each: true }),
    __metadata("design:type", Array)
], SubmitListingDto.prototype, "working_days", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Working start time in HH:mm format', example: '09:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'working_start_time must be HH:mm (00:00–23:59)' }),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "working_start_time", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Working end time in HH:mm format', example: '20:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(5),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'working_end_time must be HH:mm (00:00–23:59)' }),
    __metadata("design:type", String)
], SubmitListingDto.prototype, "working_end_time", void 0);
class StagePendingVerificationDto {
    verification_document_type;
}
__decorate([
    (0, swagger_2.ApiProperty)({ enum: ['clinic_photo', 'prescription_pad', 'invoice', 'other', 'dentist_photo', 'clinic_image'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['clinic_photo', 'prescription_pad', 'invoice', 'other', 'dentist_photo', 'clinic_image']),
    __metadata("design:type", String)
], StagePendingVerificationDto.prototype, "verification_document_type", void 0);
class DiscardPendingVerificationDto {
    upload_token;
}
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'JWT returned by pending-verification upload' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DiscardPendingVerificationDto.prototype, "upload_token", void 0);
const CITY_ALIASES = {
    bengaluru: ['bengaluru', 'bangalore'],
    bangalore: ['bengaluru', 'bangalore'],
    mumbai: ['mumbai', 'bombay'],
    bombay: ['mumbai', 'bombay'],
    chennai: ['chennai', 'madras'],
    madras: ['chennai', 'madras'],
    kolkata: ['kolkata', 'calcutta'],
    calcutta: ['kolkata', 'calcutta'],
    pune: ['pune', 'poona'],
    poona: ['pune', 'poona'],
    kochi: ['kochi', 'cochin', 'ernakulam'],
    cochin: ['kochi', 'cochin', 'ernakulam'],
    ernakulam: ['kochi', 'cochin', 'ernakulam'],
    varanasi: ['varanasi', 'banaras', 'benares'],
};
function expandCitySearch(raw) {
    const city = raw.split(',')[0].trim().toLowerCase();
    return CITY_ALIASES[city] ?? [city];
}
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
function fmt12h(t) {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
}
function computeClinicAvailability(branches, schemaDay, istMinutes, bookedToday) {
    let bestBranch = null;
    let bestRemainingSlots = -1;
    for (const b of branches) {
        if (!b.working_days || !b.working_start_time || !b.working_end_time)
            continue;
        const days = b.working_days.split(',').map((d) => parseInt(d.trim(), 10));
        if (!days.includes(schemaDay))
            continue;
        const remaining = (0, public_directory_image_utils_js_1.countRemainingSlots)(b, istMinutes);
        if (remaining > bestRemainingSlots) {
            bestRemainingSlots = remaining;
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
    const startMin = (0, public_directory_image_utils_js_1.timeToMins)(bestBranch.working_start_time);
    const endMin = (0, public_directory_image_utils_js_1.timeToMins)(bestBranch.working_end_time);
    const openNow = istMinutes >= startMin && istMinutes < endMin;
    const availableSlots = Math.max(0, bestRemainingSlots - bookedToday);
    return {
        available_today: true,
        open_now: openNow,
        opens_at: fmt12h(bestBranch.working_start_time),
        closes_at: fmt12h(bestBranch.working_end_time),
        total_slots_today: bestRemainingSlots,
        available_slots_today: availableSlots,
    };
}
const PUBLIC_DOCTOR_WHERE = {
    status: 'active',
    listed_in_directory: true,
};
let PublicDirectoryController = class PublicDirectoryController {
    prisma;
    s3;
    config;
    jwt;
    listingVerification;
    listingOtp;
    emailProvider;
    logger = new (class {
        log = (m) => console.log(`[PublicDirectory] ${m}`);
        warn = (m) => console.warn(`[PublicDirectory] ${m}`);
    })();
    constructor(prisma, s3, config, jwt, listingVerification, listingOtp, emailProvider) {
        this.prisma = prisma;
        this.s3 = s3;
        this.config = config;
        this.jwt = jwt;
        this.listingVerification = listingVerification;
        this.listingOtp = listingOtp;
        this.emailProvider = emailProvider;
    }
    async signedUrlIfExists(key) {
        if (!key)
            return null;
        if (key.startsWith('http://') || key.startsWith('https://'))
            return key;
        if (!(await this.s3.objectExists(key)))
            return null;
        return this.s3.getSignedUrl(key).catch(() => null);
    }
    ensurePlatformEmail() {
        if (this.emailProvider.isConfigured(PLATFORM_CLINIC_ID))
            return true;
        const host = this.config.get('app.smtp.host');
        const user = this.config.get('app.smtp.user');
        if (!host || !user)
            return false;
        this.emailProvider.configure(PLATFORM_CLINIC_ID, {
            host,
            port: this.config.get('app.smtp.port') || 587,
            user,
            pass: this.config.get('app.smtp.pass') || '',
            from: this.config.get('app.smtp.from') || user,
            secure: this.config.get('app.smtp.secure') || false,
        }, 'smtp-env');
        return true;
    }
    async searchClinics(query, res) {
        const { lat, lng, city, specialty, q, country, page = 1, limit = 12, availableToday, radius, sort = 'relevance' } = query;
        const isSimpleList = !q && !availableToday && !lat && !lng && !specialty && !city && !country;
        if (isSimpleList) {
            res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
        }
        const andConditions = [];
        if (city) {
            const variants = expandCitySearch(city);
            andConditions.push({
                OR: variants.map((v) => ({ city: { contains: v, mode: 'insensitive' } })),
            });
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
                directory_clinic_image_url: true,
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
                        slot_duration: true, buffer_minutes: true, default_appt_duration: true,
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
        const googleReviewStats = await this.getGoogleReviewStatsMap(clinicIds);
        let enriched = await Promise.all(clinics.map(async (c) => {
            const reviews = c.directory_reviews;
            const googleStats = googleReviewStats.get(c.id);
            const { review_count, avg_rating } = (0, directory_reviews_merge_utils_js_1.mergeListingReviewStats)(reviews.map((r) => r.overall_rating), googleStats?.count ?? 0, googleStats?.avg ?? null);
            const distKm = lat != null && lng != null && c.latitude && c.longitude
                ? haversineKm(lat, lng, c.latitude, c.longitude)
                : null;
            const bookedToday = apptCountMap.get(c.id) ?? 0;
            const avail = computeClinicAvailability(c.branches, schemaDay, istMinutes, bookedToday);
            const dentistPhotoKey = c.users.find((u) => u.profile_photo_url)?.profile_photo_url ?? null;
            const { branchCoverId, coverKey } = (0, public_directory_image_utils_js_1.resolveListingCover)(c.branches, c.directory_clinic_image_url, dentistPhotoKey);
            const signedUsers = await Promise.all(c.users.map(async (u) => ({
                ...u,
                profile_photo_url: await this.signedUrlIfExists(u.profile_photo_url),
            })));
            const branchCoverPhotoUrl = !branchCoverId ? await this.signedUrlIfExists(coverKey) : null;
            return {
                id: c.id, name: c.name, address: c.address, city: c.city, state: c.state,
                country: c.country, phone: c.phone, logo_url: c.logo_url,
                clinic_description: c.clinic_description, specialties: c.specialties,
                working_hours_label: c.working_hours_label,
                google_maps_url: c.google_maps_url, website_url: c.website_url,
                users: signedUsers,
                branch_cover_id: branchCoverId,
                branch_cover_photo_url: branchCoverPhotoUrl,
                lat: c.latitude ?? null,
                lng: c.longitude ?? null,
                review_count,
                avg_rating,
                distance_km: distKm ? Math.round(distKm * 10) / 10 : null,
                available_today: avail.available_today,
                open_now: avail.open_now,
                opens_at: avail.opens_at,
                closes_at: avail.closes_at,
                total_slots_today: avail.total_slots_today,
                available_slots_today: avail.available_slots_today,
            };
        }));
        if (availableToday) {
            enriched = enriched.filter((c) => (c.available_slots_today ?? 0) > 0);
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
    async listForSitemap(res) {
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        const clinics = await this.prisma.clinic.findMany({
            where: { listed_in_directory: true, is_suspended: false },
            select: { id: true, updated_at: true },
            orderBy: { created_at: 'desc' },
        });
        return clinics;
    }
    async getFeaturedClinics(res) {
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
                directory_clinic_image_url: true,
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
                        slot_duration: true, buffer_minutes: true, default_appt_duration: true,
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
        const googleReviewStats = await this.getGoogleReviewStatsMap(clinicIds);
        return Promise.all(clinics.map(async (c) => {
            const reviews = c.directory_reviews;
            const googleStats = googleReviewStats.get(c.id);
            const { review_count, avg_rating } = (0, directory_reviews_merge_utils_js_1.mergeListingReviewStats)(reviews.map((r) => r.overall_rating), googleStats?.count ?? 0, googleStats?.avg ?? null);
            const bookedToday = apptCountMap.get(c.id) ?? 0;
            const avail = computeClinicAvailability(c.branches, schemaDay, istMinutes, bookedToday);
            const dentistPhotoKey = c.users.find((u) => u.profile_photo_url)?.profile_photo_url ?? null;
            const { branchCoverId, coverKey } = (0, public_directory_image_utils_js_1.resolveListingCover)(c.branches, c.directory_clinic_image_url, dentistPhotoKey);
            const signedUsers = await Promise.all(c.users.map(async (u) => ({
                ...u,
                profile_photo_url: await this.signedUrlIfExists(u.profile_photo_url),
            })));
            const branchCoverPhotoUrl = !branchCoverId ? await this.signedUrlIfExists(coverKey) : null;
            return {
                id: c.id, name: c.name, address: c.address, city: c.city, state: c.state,
                country: c.country, phone: c.phone, logo_url: c.logo_url,
                clinic_description: c.clinic_description, specialties: c.specialties,
                working_hours_label: c.working_hours_label,
                google_maps_url: c.google_maps_url, website_url: c.website_url,
                users: signedUsers,
                branch_cover_id: branchCoverId,
                branch_cover_photo_url: branchCoverPhotoUrl,
                review_count,
                avg_rating,
                available_today: avail.available_today,
                open_now: avail.open_now,
            };
        }));
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
                directory_clinic_image_url: true,
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
                    where: PUBLIC_DOCTOR_WHERE,
                    select: {
                        id: true,
                        name: true,
                        bio: true,
                        years_experience: true,
                        education: true,
                        specializations: true,
                        treatments_offered: true,
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
        const [directoryReviews, googleReviews, directoryAgg] = await Promise.all([
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
            }),
            this.prisma.googleReview.findMany({
                where: { clinic_id: clinicId, rating: { gte: 1, lte: 5 } },
                select: {
                    id: true,
                    reviewer_name: true,
                    reviewer_photo_url: true,
                    rating: true,
                    comment: true,
                    review_created_at: true,
                },
            }),
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
        ]);
        const publicReviews = [
            ...directoryReviews.map(directory_reviews_merge_utils_js_1.mapDirectoryReviewToPublic),
            ...googleReviews.map((r) => (0, directory_reviews_merge_utils_js_1.mapGoogleReviewToPublic)({
                id: r.id,
                reviewer_name: r.reviewer_name,
                reviewer_photo_url: r.reviewer_photo_url,
                rating: r.rating,
                comment: r.comment,
                review_created_at: r.review_created_at,
            })),
        ];
        const combined = (0, directory_reviews_merge_utils_js_1.combineRatingStats)(directoryReviews.map((r) => r.overall_rating), googleReviews.map((r) => r.rating));
        const recentReviews = (0, directory_reviews_merge_utils_js_1.sortPublicReviews)(publicReviews, 'recent').slice(0, 5);
        const clinicCoverKey = clinic.directory_clinic_image_url;
        const clinicCoverPhotoUrl = await this.signedUrlIfExists(clinicCoverKey);
        const branches = await Promise.all(clinic.branches.map(async (b) => {
            const displayKey = (0, public_directory_image_utils_js_1.resolveBranchDisplayKey)(b.photo_url, clinicCoverKey);
            const signedPhoto = await this.signedUrlIfExists(displayKey);
            return { ...b, photo_url: signedPhoto };
        }));
        const doctors = await Promise.all(clinic.users.map(async (d) => {
            const dReviews = d.directory_reviews;
            const dAvg = dReviews.length
                ? dReviews.reduce((s, r) => s + r.overall_rating, 0) / dReviews.length
                : null;
            const signedPhoto = await this.signedUrlIfExists(d.profile_photo_url);
            return {
                ...d,
                profile_photo_url: signedPhoto,
                directory_reviews: undefined,
                review_count: dReviews.length,
                avg_rating: dAvg ? Math.round(dAvg * 10) / 10 : null,
                consultation_fee: d.consultation_fee ? Number(d.consultation_fee) : null,
            };
        }));
        const rawGalleryKeys = (() => {
            try {
                return clinic.gallery_images ? JSON.parse(clinic.gallery_images) : [];
            }
            catch {
                return [];
            }
        })();
        const signedGalleryUrls = await Promise.all(rawGalleryKeys.map((k) => this.signedUrlIfExists(k)));
        const gallery_images = signedGalleryUrls.filter(Boolean).length
            ? JSON.stringify(signedGalleryUrls.filter(Boolean))
            : clinic.gallery_images;
        return {
            ...clinic,
            gallery_images,
            directory_clinic_image_url: undefined,
            clinic_cover_photo_url: clinicCoverPhotoUrl,
            branches,
            users: undefined,
            doctors,
            reviews: {
                total: combined.count,
                avg_overall: combined.avg,
                avg_cleanliness: directoryAgg._avg.cleanliness_rating
                    ? Math.round(Number(directoryAgg._avg.cleanliness_rating) * 10) / 10
                    : null,
                avg_staff: directoryAgg._avg.staff_rating
                    ? Math.round(Number(directoryAgg._avg.staff_rating) * 10) / 10
                    : null,
                avg_wait_time: directoryAgg._avg.wait_time_rating
                    ? Math.round(Number(directoryAgg._avg.wait_time_rating) * 10) / 10
                    : null,
                avg_value: directoryAgg._avg.value_rating
                    ? Math.round(Number(directoryAgg._avg.value_rating) * 10) / 10
                    : null,
                distribution: combined.distribution,
                recent: recentReviews,
            },
        };
    }
    async getClinicReviews(clinicId, query) {
        const { sort = 'recent', page = 1, limit = 10 } = query;
        const [directoryReviews, googleReviews] = await Promise.all([
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
            }),
            this.prisma.googleReview.findMany({
                where: { clinic_id: clinicId, rating: { gte: 1, lte: 5 } },
                select: {
                    id: true,
                    reviewer_name: true,
                    reviewer_photo_url: true,
                    rating: true,
                    comment: true,
                    review_created_at: true,
                },
            }),
        ]);
        const merged = (0, directory_reviews_merge_utils_js_1.sortPublicReviews)([
            ...directoryReviews.map(directory_reviews_merge_utils_js_1.mapDirectoryReviewToPublic),
            ...googleReviews.map((r) => (0, directory_reviews_merge_utils_js_1.mapGoogleReviewToPublic)({
                id: r.id,
                reviewer_name: r.reviewer_name,
                reviewer_photo_url: r.reviewer_photo_url,
                rating: r.rating,
                comment: r.comment,
                review_created_at: r.review_created_at,
            })),
        ], sort);
        return (0, directory_reviews_merge_utils_js_1.paginatePublicReviews)(merged, page, limit);
    }
    async getReviewToken(token) {
        if (!token || token.length > 64)
            throw new common_1.BadRequestException('Invalid token');
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
        if (!review)
            throw new common_1.NotFoundException('Review link not found or expired');
        if (review.token_used_at)
            throw new common_1.BadRequestException('This review link has already been used');
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
                approval_status: 'submitted',
                is_visible: false,
            },
            select: { id: true, clinic_id: true, overall_rating: true },
        });
        this.notifyClinicOfNewReview(review.clinic_id, review.id, review.overall_rating).catch(() => { });
        return { success: true, message: 'Thank you for your review! It will appear on the clinic\'s profile once approved.', review_id: review.id };
    }
    async sendListingPhoneOtp(dto) {
        const phone = dto.phone.trim();
        const phoneKey = await this.listingOtp.assertPhoneSendAllowed(phone);
        const otp = String((0, crypto_1.randomInt)(100000, 999999));
        const apiKey = this.config.get('app.sms.apiKey');
        const templateId = this.config.get('app.sms.defaultDltTemplateId');
        if (!apiKey || !templateId) {
            this.logger.warn('Platform SMS not configured — listing phone OTP not sent');
            await this.listingOtp.storePhoneOtp(phoneKey, otp);
            return { message: 'OTP generated. (SMS not configured on server)' };
        }
        const senderId = this.config.get('app.sms.senderId') || 'SDDSK';
        const entityId = this.config.get('app.sms.entityId') || '';
        const templateBody = this.config.get('app.sms.dltTemplateBody') ||
            "Your otp for {#var#} by grats it is {#var#}, otp valid for 10min, please don't share with any one,";
        let slot = 0;
        const text = templateBody.replace(/\{#var#\}/g, () => {
            slot++;
            if (slot === 1)
                return 'listing your practice on Smart Dental Desk';
            if (slot === 2)
                return otp;
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
        if (entityId)
            params.set('EntityId', entityId);
        let smsErr;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const res = await fetch(`https://www.smsgatewayhub.com/api/mt/SendSMS?${params.toString()}`, {
                    signal: AbortSignal.timeout(45_000),
                });
                const data = await res.json();
                const ok = data['ErrorCode'] === '000' || data['ErrorCode'] === 0;
                if (!ok) {
                    smsErr = String(data['ErrorMessage'] ?? 'SMS gateway error');
                    this.logger.warn(`Listing phone OTP attempt ${attempt} failed to ${number}: ${smsErr}`);
                }
                else {
                    this.logger.log(`Listing phone OTP sent to ${number} (attempt ${attempt})`);
                    smsErr = undefined;
                    break;
                }
            }
            catch (err) {
                smsErr = err instanceof Error ? err.message : 'SMS gateway timeout';
                this.logger.warn(`Listing phone OTP attempt ${attempt} failed to ${number}: ${smsErr}`);
            }
            if (attempt < 3)
                await new Promise((r) => setTimeout(r, 2000));
        }
        if (smsErr) {
            await this.listingOtp.rollbackPhoneSend(phoneKey);
            throw new common_1.BadRequestException('Could not send SMS OTP. Please try again.');
        }
        await this.listingOtp.storePhoneOtp(phoneKey, otp);
        return { message: 'OTP sent to your mobile number. Valid for 10 minutes.' };
    }
    async verifyListingPhoneOtp(dto) {
        const phoneKey = this.listingOtp.normalizePhoneKey(dto.phone);
        await this.listingOtp.verifyPhoneOtp(phoneKey, dto.code.trim());
        const token = await this.jwt.signAsync({ phone: phoneKey, type: 'listing_phone_verified' }, { expiresIn: '60m' });
        return { verified: true, token, message: 'Phone verified successfully.' };
    }
    async sendListingEmailOtp(dto) {
        try {
            const payload = await this.jwt.verifyAsync(dto.phone_token);
            if (payload.type !== 'listing_phone_verified')
                throw new Error('wrong type');
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired phone verification token. Please verify your phone first.');
        }
        const emailKey = await this.listingOtp.assertEmailSendAllowed(dto.email);
        const otp = String((0, crypto_1.randomInt)(100000, 999999));
        if (!this.ensurePlatformEmail()) {
            this.logger.warn('Platform SMTP not configured — listing email OTP not sent');
            await this.listingOtp.storeEmailOtp(emailKey, otp);
            return { message: 'OTP generated. (Email not configured on server)' };
        }
        const fromAddr = this.config.get('app.smtp.from')
            || this.config.get('app.smtp.user')
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
        let lastErr;
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
            if (attempt < 4)
                await new Promise((r) => setTimeout(r, 3000));
        }
        if (lastErr) {
            await this.listingOtp.rollbackEmailSend(emailKey);
            throw new common_1.BadRequestException('Could not send email OTP. Please try again.');
        }
        await this.listingOtp.storeEmailOtp(emailKey, otp);
        return { message: 'OTP sent to your email address. Valid for 10 minutes.' };
    }
    async verifyListingEmailOtp(dto) {
        const emailKey = this.listingOtp.normalizeEmailKey(dto.email);
        await this.listingOtp.verifyEmailOtp(emailKey, dto.code.trim());
        const token = await this.jwt.signAsync({ email: emailKey, type: 'listing_email_verified' }, { expiresIn: '60m' });
        return { verified: true, token, message: 'Email verified successfully.' };
    }
    async stagePendingVerification(file, dto) {
        return this.listingVerification.stagePendingUpload(file, dto.verification_document_type);
    }
    async discardPendingVerification(dto) {
        return this.listingVerification.discardPendingUpload(dto.upload_token);
    }
    async submitListing(file, dto) {
        let docKey = null;
        let docType = null;
        let stagedUploadId = null;
        const orphanKeysOnFailure = [];
        if (dto.working_start_time && dto.working_end_time) {
            const [sh, sm] = dto.working_start_time.split(':').map(Number);
            const [eh, em] = dto.working_end_time.split(':').map(Number);
            const startMins = sh * 60 + sm;
            const endMins = eh * 60 + em;
            if (endMins <= startMins) {
                throw new common_1.BadRequestException('Closing time must be after opening time.');
            }
        }
        if (dto.verification_upload_token) {
            const staged = await this.listingVerification.resolveStagedUpload(dto.verification_upload_token, dto.verification_document_type);
            docKey = staged.s3_key;
            docType = staged.document_type;
            stagedUploadId = staged.id;
            orphanKeysOnFailure.push(staged.s3_key);
        }
        else if (file) {
            if (!dto.verification_document_type) {
                throw new common_1.BadRequestException('Please select a document type when uploading a verification file.');
            }
            docKey = await this.listingVerification.uploadAndTrack(file, dto.verification_document_type);
            docType = dto.verification_document_type;
        }
        let dentistPhotoKey = null;
        {
            const staged = await this.listingVerification.resolveStagedUpload(dto.dentist_photo_upload_token, 'dentist_photo');
            dentistPhotoKey = staged.s3_key;
            orphanKeysOnFailure.push(staged.s3_key);
        }
        let clinicImageKey = null;
        if (dto.clinic_image_upload_token) {
            const staged = await this.listingVerification.resolveStagedUpload(dto.clinic_image_upload_token, 'clinic_image');
            clinicImageKey = staged.s3_key;
            orphanKeysOnFailure.push(staged.s3_key);
        }
        if (!clinicImageKey) {
            clinicImageKey = dentistPhotoKey;
        }
        let verifiedPhone;
        try {
            const payload = await this.jwt.verifyAsync(dto.phone_token);
            if (payload.type !== 'listing_phone_verified')
                throw new Error('wrong type');
            verifiedPhone = payload.phone;
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired phone verification token.');
        }
        let verifiedEmail;
        try {
            const payload = await this.jwt.verifyAsync(dto.email_token);
            if (payload.type !== 'listing_email_verified')
                throw new Error('wrong type');
            verifiedEmail = payload.email;
        }
        catch {
            throw new common_1.BadRequestException('Invalid or expired email verification token.');
        }
        const siteUrl = this.config.get('app.frontendUrl') || 'https://smartdentaldesk.com';
        const existingUser = await this.prisma.user.findFirst({
            where: {
                status: 'active',
                OR: [{ email: verifiedEmail }, { phone: verifiedPhone }],
            },
            select: { id: true },
        });
        if (existingUser) {
            throw new common_1.BadRequestException(`A clinic account already exists with this mobile or email. Please login at ${siteUrl}/login to manage or update your listing.`);
        }
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
            if (existing.directory_approval_status === 'rejected') {
                throw new common_1.BadRequestException('A previous listing request with this email or phone was rejected. Please contact support@smartdentaldesk.com to re-apply.');
            }
        }
        let clinic;
        try {
            clinic = await this.prisma.clinic.create({
                data: {
                    name: dto.clinic_name.trim(),
                    email: verifiedEmail,
                    phone: (0, phone_util_js_1.normalizePhoneE164)(verifiedPhone) ?? verifiedPhone,
                    address: dto.address.trim(),
                    city: dto.city.trim(),
                    state: dto.state.trim(),
                    country: 'India',
                    pincode: dto.pincode?.trim() ?? null,
                    google_maps_url: dto.google_maps_url?.trim() ?? null,
                    latitude: dto.latitude ?? null,
                    longitude: dto.longitude ?? null,
                    specialties: dto.specialties.join(','),
                    directory_treatments: dto.treatments.join(','),
                    working_hours_label: dto.working_hours_label?.trim() ?? null,
                    languages_spoken: dto.languages_spoken.trim(),
                    website_url: dto.website_url?.trim() ?? null,
                    clinic_description: dto.clinic_description?.trim() ?? null,
                    directory_verification_document_url: docKey,
                    directory_verification_document_type: docType,
                    established_year: dto.established_year,
                    directory_dentist_photo_url: dentistPhotoKey,
                    directory_clinic_image_url: clinicImageKey,
                    directory_dentist_years_experience: dto.years_experience,
                    directory_working_days: dto.working_days.join(','),
                    directory_working_start_time: dto.working_start_time.trim(),
                    directory_working_end_time: dto.working_end_time.trim(),
                    is_directory_only: true,
                    directory_contact_name: dto.contact_name.trim(),
                    directory_approval_status: 'pending',
                    directory_requested_at: new Date(),
                    directory_terms_accepted_at: new Date(),
                    listed_in_directory: false,
                    subscription_status: 'directory',
                },
                select: { id: true, name: true },
            });
        }
        catch (err) {
            await this.listingVerification.discardOrphanKeys([
                ...orphanKeysOnFailure,
                ...(!stagedUploadId && docKey ? [docKey] : []),
            ]);
            throw err;
        }
        this.notifySuperAdmin(clinic.name, dto.contact_name, verifiedPhone, verifiedEmail).catch(() => { });
        this.logger.log(`Free listing submitted: clinic ${clinic.id} (${clinic.name}) — pending approval`);
        return {
            success: true,
            clinic_id: clinic.id,
            message: 'Your listing has been submitted for review. We will notify you at your email once it is approved (usually within 24 hours).',
        };
    }
    async notifySuperAdmin(clinicName, contactName, phone, email) {
        const host = this.config.get('app.smtp.host');
        const user = this.config.get('app.smtp.user');
        const pass = this.config.get('app.smtp.pass') || '';
        const fromAddr = this.config.get('app.smtp.from') || user || 'noreply@smartdentaldesk.com';
        const port = this.config.get('app.smtp.port') || 587;
        const secure = this.config.get('app.smtp.secure') || false;
        const siteUrl = this.config.get('app.frontendUrl') || 'https://smartdentaldesk.com';
        if (!host || !user)
            return;
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
    async getGoogleReviewStatsMap(clinicIds) {
        if (!clinicIds.length)
            return new Map();
        const groups = await this.prisma.googleReview.groupBy({
            by: ['clinic_id'],
            where: { clinic_id: { in: clinicIds }, rating: { gte: 1, lte: 5 } },
            _count: { id: true },
            _avg: { rating: true },
        });
        return new Map(groups.map((g) => [
            g.clinic_id,
            {
                count: g._count.id,
                avg: g._avg.rating != null ? Math.round(Number(g._avg.rating) * 10) / 10 : null,
            },
        ]));
    }
    async notifyClinicOfNewReview(clinicId, reviewId, rating) {
        const admins = await this.prisma.user.findMany({
            where: { clinic_id: clinicId, role: { in: ['Admin', 'SuperAdmin'] }, status: 'active' },
            select: { id: true },
        });
        if (!admins.length)
            return;
        const stars = rating;
        await this.prisma.notification.createMany({
            data: admins.map((admin) => ({
                clinic_id: clinicId,
                user_id: admin.id,
                type: 'review_submitted',
                title: 'New patient review awaiting approval',
                body: `A patient left a ${stars}-star review. Go to Reviews to approve or reject it.`,
                metadata: { review_id: reviewId },
            })),
        });
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
    (0, common_1.Get)('sitemap'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all directory-listed clinics (id + updated_at) for sitemap generation' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "listForSitemap", null);
__decorate([
    (0, common_1.Get)('featured'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List featured directory clinics for the patient homepage' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "getFeaturedClinics", null);
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
    (0, common_1.Get)('review/:token'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get clinic info for a review token (used to display clinic name on the form)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "getReviewToken", null);
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
__decorate([
    (0, common_1.Post)('list-practice/send-phone-otp'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Send SMS OTP to phone for free listing verification' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendPhoneOtpDto]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "sendListingPhoneOtp", null);
__decorate([
    (0, common_1.Post)('list-practice/verify-phone-otp'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Verify phone OTP for free listing; returns a short-lived phone token' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyPhoneOtpDto]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "verifyListingPhoneOtp", null);
__decorate([
    (0, common_1.Post)('list-practice/send-email-otp'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Send email OTP for free listing (requires phone_token)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendEmailOtpDto]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "sendListingEmailOtp", null);
__decorate([
    (0, common_1.Post)('list-practice/verify-email-otp'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email OTP for free listing; returns a short-lived email token' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyEmailOtpDto]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "verifyListingEmailOtp", null);
__decorate([
    (0, common_1.Post)('list-practice/pending-verification'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Stage a verification document before OTP steps (cleaned up if listing is abandoned)' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('verification_document', { limits: { fileSize: listing_verification_service_js_1.LISTING_VERIFICATION_MAX_BYTES } })),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StagePendingVerificationDto]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "stagePendingVerification", null);
__decorate([
    (0, common_1.Post)('list-practice/discard-pending-verification'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a staged verification document when the user abandons or replaces it' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [DiscardPendingVerificationDto]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "discardPendingVerification", null);
__decorate([
    (0, common_1.Post)('list-practice/submit'),
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a free practice listing after phone + email verification' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('verification_document', { limits: { fileSize: listing_verification_service_js_1.LISTING_VERIFICATION_MAX_BYTES } })),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SubmitListingDto]),
    __metadata("design:returntype", Promise)
], PublicDirectoryController.prototype, "submitListing", null);
exports.PublicDirectoryController = PublicDirectoryController = __decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, swagger_1.ApiTags)('Public Directory'),
    (0, common_1.Controller)('public/directory'),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        s3_service_js_1.S3Service,
        config_1.ConfigService,
        jwt_1.JwtService,
        listing_verification_service_js_1.ListingVerificationService,
        listing_otp_service_js_1.ListingOtpService,
        email_provider_js_1.EmailProvider])
], PublicDirectoryController);
//# sourceMappingURL=public-directory.controller.js.map