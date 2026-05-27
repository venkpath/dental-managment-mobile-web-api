import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PatientService } from './patient.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { type PatientImportJobData } from './patient-import.producer.js';
export declare class PatientImportProcessor extends WorkerHost {
    private readonly patientService;
    private readonly s3Service;
    private readonly logger;
    constructor(patientService: PatientService, s3Service: S3Service);
    process(job: Job<PatientImportJobData>): Promise<void>;
}
