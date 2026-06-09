import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { CurrentSuperAdmin } from '../../common/decorators/current-super-admin.decorator.js';
import { SupportTicketService } from './support-ticket.service.js';
import { CreateSupportTicketDto, UpdateSupportTicketDto, AddTicketCommentDto } from './dto/index.js';

interface RequestUser {
  userId: string;
  clinicId: string;
  role: string;
  branchId: string | null;
}

@ApiTags('Support Tickets')
@Controller()
export class SupportTicketController {
  constructor(private readonly service: SupportTicketService) {}

  // Authenticated clinic user — submit a ticket
  @Post('support-tickets')
  @SkipThrottle({ default: true })
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a support ticket' })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateSupportTicketDto) {
    const ticket = await this.service.create(
      { userId: user.userId, clinicId: user.clinicId },
      dto,
    );
    return {
      id: ticket.id,
      status: ticket.status,
      created_at: ticket.created_at,
    };
  }

  @Get('support-tickets/mine')
  @ApiOperation({ summary: "List the current user's submitted tickets" })
  async listMine(@CurrentUser() user: RequestUser) {
    return this.service.listMine({ userId: user.userId, clinicId: user.clinicId });
  }

  @Get('support-tickets/:id')
  @ApiOperation({ summary: 'Get a ticket with its full comment thread (clinic user)' })
  async getMyTicket(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getTicketWithComments(id, user.clinicId);
  }

  @Post('support-tickets/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a reply to a support ticket (clinic user)' })
  async addUserComment(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTicketCommentDto,
  ) {
    return this.service.addUserComment(id, user.clinicId, user.userId, dto);
  }

  // Super-admin endpoints
  @Get('super-admins/support-tickets')
  @SuperAdmin()
  @ApiOperation({ summary: 'List all support tickets (super-admin)' })
  async listAll(@Query('status') status?: string) {
    return this.service.listAll(status);
  }

  @Get('super-admins/support-tickets/:id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get a support ticket by ID with comments (super-admin)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOneWithComments(id);
  }

  @Patch('super-admins/support-tickets/:id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update support ticket status / admin notes (super-admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post('super-admins/support-tickets/:id/comments')
  @SuperAdmin()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a reply on a support ticket (super-admin)' })
  async addAdminComment(
    @CurrentSuperAdmin() admin: { id: string; name: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTicketCommentDto,
  ) {
    return this.service.addAdminComment(id, admin.name ?? 'Smart Dental Desk Support', dto);
  }
}
