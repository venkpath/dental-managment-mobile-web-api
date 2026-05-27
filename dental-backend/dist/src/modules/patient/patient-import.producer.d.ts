import { Queue } from 'bullmq';
export interface PatientImportJobData {
    jobId: string;
    clinicId: string;
    branchId: string;
    fileKey: string;
    fileMime: string;
}
export declare class PatientImportProducer {
    private readonly queue;
    constructor(queue: Queue);
    enqueue(data: PatientImportJobData): Promise<void>;
}
