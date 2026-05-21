import { Module } from '@nestjs/common';
import { PublicDisplayController } from './public-display.controller.js';

@Module({
  controllers: [PublicDisplayController],
})
export class PublicDisplayModule {}
