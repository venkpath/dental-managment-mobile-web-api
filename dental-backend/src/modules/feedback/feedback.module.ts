import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './feedback.service.js';
import { AutomationModule } from '../automation/automation.module.js';

@Module({
  imports: [AutomationModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
