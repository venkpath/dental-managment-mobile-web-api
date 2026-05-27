"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PatientImportProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientImportProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
const patient_service_js_1 = require("./patient.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
let PatientImportProcessor = PatientImportProcessor_1 = class PatientImportProcessor extends bullmq_1.WorkerHost {
    patientService;
    s3Service;
    logger = new common_1.Logger(PatientImportProcessor_1.name);
    constructor(patientService, s3Service) {
        super();
        this.patientService = patientService;
        this.s3Service = s3Service;
    }
    async process(job) {
        const { jobId, clinicId, branchId, fileKey, fileMime } = job.data;
        try {
            await this.patientService.updateImportJob(jobId, { status: 'processing' });
            const buffer = await this.s3Service.getObject(fileKey);
            if (!buffer)
                throw new Error('Import file not found in storage');
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
        }
        catch (error) {
            this.logger.error(`Patient import job ${jobId} failed: ${error}`);
            await this.patientService.updateImportJob(jobId, {
                status: 'failed',
                errors: [{ row: 0, reason: error.message }],
            });
        }
    }
};
exports.PatientImportProcessor = PatientImportProcessor;
exports.PatientImportProcessor = PatientImportProcessor = PatientImportProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_js_1.QUEUE_NAMES.PATIENT_IMPORT),
    __metadata("design:paramtypes", [patient_service_js_1.PatientService,
        s3_service_js_1.S3Service])
], PatientImportProcessor);
//# sourceMappingURL=patient-import.processor.js.map