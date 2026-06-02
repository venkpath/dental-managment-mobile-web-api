import { Body, Controller, Post, Get, Param, ParseUUIDPipe, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { AuthService } from './auth.service.js';
import { LoginDto, LookupDto, LookupByPhoneDto, LoginByPhoneDto, RegisterClinicDto, ChangePasswordDto, RefreshTokenDto } from './dto/index.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Look up clinics for an email/password combination' })
  @ApiResponse({ status: 200, description: 'List of clinics the user belongs to' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async lookup(@Body() dto: LookupDto) {
    return this.authService.lookup(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email, password and clinic_id' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, req);
    // Set JWT in secure httpOnly cookie
    const isProduction = process.env['NODE_ENV'] === 'production';
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    return result;
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('lookup-by-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Look up clinics for a phone/password combination (phone_verified users only)' })
  @ApiResponse({ status: 200, description: 'List of clinics the user belongs to' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async lookupByPhone(@Body() dto: LookupByPhoneDto) {
    return this.authService.lookupByPhone(dto.phone, dto.password);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login-by-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with phone, password and clinic_id (phone_verified users only)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified phone' })
  async loginByPhone(
    @Body() dto: LoginByPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginByPhone(dto.phone, dto.password, dto.clinic_id, req);
    const isProduction = process.env['NODE_ENV'] === 'production';
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    return result;
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(dto.refresh_token);
    const isProduction = process.env['NODE_ENV'] === 'production';
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    return result;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password using old and new password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Old password is incorrect or user not found' })
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new clinic with admin user (onboarding)' })
  @ApiResponse({ status: 201, description: 'Clinic and admin user created with 14-day trial' })
  @ApiResponse({ status: 409, description: 'Clinic email or admin email already exists' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  async register(@Body() dto: RegisterClinicDto) {
    return this.authService.register(dto);
  }

  // ─── Email Verification (13.1) ───

  @Post('send-verification')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email verification link to the logged-in user' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async sendVerificationEmail(@CurrentUser() user: JwtPayload) {
    return this.authService.sendVerificationEmail(user.sub, user.clinic_id);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using the token from the verification link' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  // ─── Password Reset (13.2) ───

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email. clinic_id is optional — if omitted, sends to all accounts matching the email.' })
  @ApiResponse({ status: 200, description: 'Reset email sent (if account exists)' })
  async forgotPassword(@Body() body: { email: string; clinic_id?: string }) {
    return this.authService.requestPasswordReset(body.email, body.clinic_id);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from the reset email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() body: { token: string; new_password: string }) {
    return this.authService.resetPassword(body.token, body.new_password);
  }

  // ─── Phone Verification ───

  @Post('send-phone-otp')
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number for user verification' })
  @ApiResponse({ status: 200, description: 'OTP sent to phone' })
  async sendPhoneOtp(@CurrentUser() user: JwtPayload, @Body() body: { phone: string }) {
    return this.authService.sendOtp(body.phone, user.clinic_id, 'sms');
  }

  @Post('verify-phone')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone number using OTP code' })
  @ApiResponse({ status: 200, description: 'Phone verification result' })
  async verifyPhone(@CurrentUser() user: JwtPayload, @Body() body: { phone: string; code: string }) {
    return this.authService.verifyPhone(user.sub, user.clinic_id, body.phone, body.code);
  }

  // ─── Registration WhatsApp OTP ───

  // ── Directory listing → full software conversion ─────────────────────────────

  @Public()
  @Get('claim/:clinicId')
  @ApiOperation({ summary: 'Get preview data for a free listing claim (pre-fills registration form)' })
  @ApiResponse({ status: 200, description: 'Clinic preview data for the claim form' })
  @ApiResponse({ status: 400, description: 'Not claimable (already subscriber or not approved)' })
  @ApiResponse({ status: 409, description: 'Already claimed' })
  async getClaimPreview(@Param('clinicId', ParseUUIDPipe) clinicId: string) {
    return this.authService.getClaimPreview(clinicId);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('claim')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Claim a free directory listing and activate full software (14-day trial)' })
  @ApiResponse({ status: 201, description: 'Listing claimed, admin user created' })
  @ApiResponse({ status: 400, description: 'Invalid token or listing not approved' })
  @ApiResponse({ status: 409, description: 'Already claimed or email conflict' })
  async claimDirectoryListing(@Body() body: {
    clinic_id: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
    phone_verification_token: string;
    is_doctor?: boolean;
    plan_key?: string;
    billing_cycle?: string;
  }) {
    return this.authService.claimDirectoryListing(body);
  }

  @Public()
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @Post('register/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send WhatsApp OTP to admin phone before clinic registration' })
  @ApiResponse({ status: 200, description: 'OTP sent via WhatsApp' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests' })
  async sendRegistrationOtp(@Body() body: { phone: string }) {
    return this.authService.sendRegistrationOtp(body.phone);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify WhatsApp OTP and receive a short-lived verification token for registration' })
  @ApiResponse({ status: 200, description: 'OTP verified, returns token' })
  async verifyRegistrationOtp(@Body() body: { phone: string; code: string }) {
    return this.authService.verifyRegistrationOtp(body.phone, body.code);
  }

  // ─── OTP (13.3) ───

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone or email for verification' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  async sendOtp(@Body() body: { identifier: string; clinic_id: string; channel?: 'sms' | 'email' }) {
    return this.authService.sendOtp(body.identifier, body.clinic_id, body.channel);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'OTP verification result' })
  async verifyOtp(@Body() body: { identifier: string; clinic_id: string; code: string }) {
    return this.authService.verifyOtp(body.identifier, body.clinic_id, body.code);
  }
}
