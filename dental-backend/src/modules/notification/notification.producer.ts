import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { CreateNotificationInput } from './notification.service.js';

@Injectable()
export class NotificationProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly queue: Queue,
  ) {}

  async enqueue(input: CreateNotificationInput): Promise<void> {
    await this.queue.add('create-notification', input);
  }

  async enqueueMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    await this.queue.addBulk(
      inputs.map((input) => ({ name: 'create-notification', data: input })),
    );
  }
}
