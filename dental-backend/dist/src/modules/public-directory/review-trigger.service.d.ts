import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
export declare class ReviewTriggerService {
    private readonly prisma;
    private readonly communicationService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService);
    triggerPostAppointmentReview(clinicId: string, appointmentId: string, patientId: string, dentistId: string): Promise<void>;
    triggerConsultationReview(clinicId: string, patientId: string, dentistId: string): Promise<void>;
    triggerInvoiceReview(clinicId: string, patientId: string, dentistId?: string | null): Promise<void>;
    private sendReviewRequest;
}
