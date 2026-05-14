import { Module } from '@nestjs/common';
import { SupportTicketController } from './support-ticket.controller.js';
import { SupportTicketService } from './support-ticket.service.js';

@Module({
  controllers: [SupportTicketController],
  providers: [SupportTicketService],
})
export class SupportTicketModule {}
