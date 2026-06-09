import {
  BadRequestException,
  Controller, Get, Post, Patch, Param, Body, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { DemoRequestService } from './demo-request.service.js';
import { CreateDemoRequestDto, CreateDemoRequestFromAppDto, UpdateDemoStatusDto } from './dto/demo-request.dto.js';

interface RequestUser {
  userId: string;
  clinicId: string;
}

@ApiTags('Demo Requests')
@Controller()
export class DemoRequestController {
  constructor(private readonly demoRequestService: DemoRequestService) {}

  // ── Public: anyone can submit a demo request ──
  @Post('public/demo-request')
  @Public()
  @SkipThrottle({ default: true })
  @Throttle({ strict: { ttl: 60000, limit: 3 } }) // max 3 submissions per minute per IP
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a demo request (public, no auth)' })
  @ApiCreatedResponse({ description: 'Demo request created, WhatsApp notifications sent.' })
  async create(@Body() dto: CreateDemoRequestDto) {
    const demo = await this.demoRequestService.create(dto);
    return {
      success: true,
      message: 'Demo request submitted successfully. We will contact you on WhatsApp shortly.',
      id: demo.id,
    };
  }

  // ── Authenticated: available demo slots for a date ──
  @Get('demo-requests/available-slots')
  @ApiOperation({ summary: 'List available demo time slots for a date (10 AM–10 PM IST)' })
  async getAvailableSlots(@Query('date') date: string) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Query param "date" must be YYYY-MM-DD');
    }
    return this.demoRequestService.getAvailableSlots(date);
  }

  // ── Authenticated: directory clinic submits demo request from in-app popup ──
  @Post('demo-requests/from-app')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a demo request from inside the app (directory-only clinics)' })
  async createFromApp(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDemoRequestFromAppDto,
  ) {
    const demo = await this.demoRequestService.createFromApp(
      { userId: user.userId, clinicId: user.clinicId },
      dto,
    );
    return { success: true, id: demo.id };
  }

  // ── Super-admin: list all demo requests ──
  @Get('super-admin/demo-requests')
  @SuperAdmin()
  @ApiOperation({ summary: 'List all demo requests (super-admin only)' })
  @ApiOkResponse({ description: 'List of demo requests.' })
  async findAll(@Query('status') status?: string) {
    return this.demoRequestService.findAll(status);
  }

  // ── Super-admin: get single demo request ──
  @Get('super-admin/demo-requests/:id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get a demo request by ID (super-admin only)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.demoRequestService.findOne(id);
  }

  // ── Super-admin: update status (contacted, scheduled, etc.) ──
  @Patch('super-admin/demo-requests/:id/status')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update demo request status (super-admin only)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDemoStatusDto,
  ) {
    return this.demoRequestService.updateStatus(id, dto);
  }
}
