import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { CreatePrescriptionDto, UpdatePrescriptionDto, QueryPrescriptionDto } from './dto/index.js';
import { Prescription } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { PrescriptionPdfService } from './prescription-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
export declare class PrescriptionService {
    private readonly prisma;
    private readonly pdfService;
    private readonly s3Service;
    private readonly communicationService;
    private readonly automationService;
    constructor(prisma: PrismaService, pdfService: PrescriptionPdfService, s3Service: S3Service, communicationService: CommunicationService, automationService: AutomationService);
    create(clinicId: string, dto: CreatePrescriptionDto): Promise<Prescription>;
    findAll(clinicId: string, query: QueryPrescriptionDto): Promise<PaginatedResult<Prescription>>;
    findOne(clinicId: string, id: string): Promise<Prescription>;
    update(clinicId: string, id: string, dto: UpdatePrescriptionDto): Promise<Prescription>;
    getPdfUrl(clinicId: string, id: string, options?: {
        withBackground?: boolean;
    }): Promise<{
        url: string;
    }>;
    sendWhatsApp(clinicId: string, id: string): Promise<{
        message: string;
    }>;
    findByPatient(clinicId: string, patientId: string): Promise<Prescription[]>;
}
