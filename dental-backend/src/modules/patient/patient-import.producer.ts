import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

export interface PatientImportJobData {
  jobId: string;
  clinicId: string;
  branchId: string;
  fileKey: string;
  fileMime: string;
}

@Injectable()
export class PatientImportProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.PATIENT_IMPORT) private readonly queue: Queue,
  ) {}

  async enqueue(data: PatientImportJobData): Promise<void> {
    await this.queue.add('process-import', data, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}
