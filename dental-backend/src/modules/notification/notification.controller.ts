import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiHeader,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service.js';
import { NotificationCronService } from './notification.cron.js';
import { QueryNotificationDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { UserRole } from '../user/dto/index.js';

@ApiTags('Notifications')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly cronService: NotificationCronService,
  ) {}

  @Post('trigger-crons')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger all notification cron jobs (Admin only, for testing)' })
  @ApiOkResponse({ description: 'Cron jobs executed' })
  async triggerCrons() {
    const results: Record<string, string> = {};

    try {
      await this.cronService.appointmentReminders();
      results['appointment_reminders'] = 'ok';
    } catch (e) {
      results['appointment_reminders'] = `error: ${(e as Error).message}`;
    }

    try {
      await this.cronService.paymentOverdueAlerts();
      results['payment_overdue'] = 'ok';
    } catch (e) {
      results['payment_overdue'] = `error: ${(e as Error).message}`;
    }

    try {
      await this.cronService.lowInventoryAlerts();
      results['low_inventory'] = 'ok';
    } catch (e) {
      results['low_inventory'] = `error: ${(e as Error).message}`;
    }

    return { message: 'Cron jobs triggered', results };
  }

  @Post('trigger/:jobName')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger a single notification cron job by name' })
  @ApiOkResponse({ description: 'Cron job executed' })
  async triggerSingleCron(@Param('jobName') jobName: string) {
    const jobMap: Record<string, () => Promise<void>> = {
      appointmentReminders: () => this.cronService.appointmentReminders(),
      paymentOverdueAlerts: () => this.cronService.paymentOverdueAlerts(),
      lowInventoryAlerts: () => this.cronService.lowInventoryAlerts(),
    };

    const fn = jobMap[jobName];
    if (!fn) {
      throw new (await import('@nestjs/common')).BadRequestException(
        `Unknown job: ${jobName}. Valid jobs: ${Object.keys(jobMap).join(', ')}`,
      );
    }

    try {
      await fn();
      return { job: jobName, status: 'success' };
    } catch (e) {
      return { job: jobName, status: 'error', error: (e as Error).message };
    }
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiOkResponse({ description: 'Paginated list of notifications' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.findByClinicAndUser(clinicId, user.sub, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiOkResponse({ description: 'Unread count' })
  async unreadCount(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const count = await this.notificationService.getUnreadCount(clinicId, user.sub);
    return { count };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ description: 'Number of notifications marked as read' })
  async markAllRead(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const count = await this.notificationService.markAllAsRead(clinicId, user.sub);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ description: 'Updated notification' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  async markRead(
    @CurrentClinic() clinicId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(clinicId, id);
  }
}
