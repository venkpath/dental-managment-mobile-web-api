import { Global, Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiUsageService } from './ai-usage.service.js';

@Global()
@Module({
  controllers: [AiController],
  providers: [AiService, AiUsageService],
  exports: [AiService, AiUsageService],
})
export class AiModule {}
