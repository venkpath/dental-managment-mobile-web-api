import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

export interface CommunicationJobData {
  messageId: string;
  clinicId: string; // multi-tenant: which clinic's provider config to use
  channel: string;
  to: string;
  subject?: string;
  body: string;
  html?: string;
  templateId?: string; // provider-specific (DLT/HSM)
  /** WhatsApp template variables — ordered values for Meta template components */
  variables?: Record<string, string>;
  /** Template language code (e.g. 'en', 'en_US') for WhatsApp */
  language?: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: string;
}

@Injectable()
export class CommunicationProducer {
  private readonly logger = new Logger(CommunicationProducer.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.COMMUNICATION_EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COMMUNICATION_SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COMMUNICATION_WHATSAPP) private readonly whatsappQueue: Queue,
  ) {}

  async enqueue(job: CommunicationJobData): Promise<void> {
    const queue = this.getQueue(job.channel);
    if (!queue) {
      this.logger.warn(`No queue for channel: ${job.channel}`);
      return;
    }

    const jobOptions: Record<string, unknown> = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    };

    // Handle scheduled messages
    if (job.scheduledAt) {
      const delay = new Date(job.scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        jobOptions.delay = delay;
      }
    }

    await queue.add(`send_${job.channel}`, job, jobOptions);
    this.logger.debug(`Job queued: ${job.channel} → ${job.to} (message: ${job.messageId})`);
  }

  async enqueueBulk(jobs: CommunicationJobData[]): Promise<void> {
    if (jobs.length === 0) return;

    // Group jobs by channel
    const grouped = new Map<string, CommunicationJobData[]>();
    for (const job of jobs) {
      const existing = grouped.get(job.channel) || [];
      existing.push(job);
      grouped.set(job.channel, existing);
    }

    for (const [channel, channelJobs] of grouped) {
      const queue = this.getQueue(channel);
      if (!queue) continue;

      await queue.addBulk(
        channelJobs.map((job) => ({
          name: `send_${channel}`,
          data: job,
          opts: {
            attempts: 3,
            backoff: { type: 'exponential' as const, delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        })),
      );

      this.logger.debug(`${channelJobs.length} ${channel} jobs queued`);
    }
  }

  private getQueue(channel: string): Queue | null {
    switch (channel) {
      case 'email': return this.emailQueue;
      case 'sms': return this.smsQueue;
      case 'whatsapp': return this.whatsappQueue;
      default: return null;
    }
  }
}
