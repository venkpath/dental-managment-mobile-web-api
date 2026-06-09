import { Module } from '@nestjs/common';
import { SupportTicketController } from './support-ticket.controller.js';
import { SupportTicketService } from './support-ticket.service.js';
import { NotificationModule } from '../notification/notification.module.js';

@Module({
  imports: [NotificationModule],
  controllers: [SupportTicketController],
  providers: [SupportTicketService],
})
export class SupportTicketModule {}
