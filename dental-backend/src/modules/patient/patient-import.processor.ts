import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { PatientService } from './patient.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { type PatientImportJobData } from './patient-import.producer.js';

@Processor(QUEUE_NAMES.PATIENT_IMPORT)
export class PatientImportProcessor extends WorkerHost {
  private readonly logger = new Logger(PatientImportProcessor.name);

  constructor(
    private readonly patientService: PatientService,
    private readonly s3Service: S3Service,
  ) {
    super();
  }

  async process(job: Job<PatientImportJobData>): Promise<void> {
    const { jobId, clinicId, branchId, fileKey, fileMime } = job.data;
    try {
      await this.patientService.updateImportJob(jobId, { status: 'processing' });

      const buffer = await this.s3Service.getObject(fileKey);
      if (!buffer) throw new Error('Import file not found in storage');
      const rows = this.patientService.parseFile(buffer, fileMime);

      await this.patientService.updateImportJob(jobId, { total: rows.length });

      const result = await this.patientService.bulkImport(clinicId, branchId, rows);

      await this.patientService.updateImportJob(jobId, {
        status: 'done',
        total: rows.length,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
      });
    } catch (error) {
      this.logger.error(`Patient import job ${jobId} failed: ${error}`);
      await this.patientService.updateImportJob(jobId, {
        status: 'failed',
        errors: [{ row: 0, reason: (error as Error).message }],
      });
    }
  }
}
