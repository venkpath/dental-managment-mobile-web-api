import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { TestQueueController } from './test-queue.controller.js';
import { TestQueueProducer } from './test-queue.producer.js';
import { TestQueueProcessor } from './test-queue.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.TEST })],
  controllers: [TestQueueController],
  providers: [TestQueueProducer, TestQueueProcessor],
})
export class TestQueueModule {}
