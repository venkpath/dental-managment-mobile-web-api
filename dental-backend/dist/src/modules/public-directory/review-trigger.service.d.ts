import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
export declare class ReviewTriggerService {
    private readonly prisma;
    private readonly communicationService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService);
    triggerPostAppointmentReview(clinicId: string, appointmentId: string, patientId: string, dentistId: string): Promise<void>;
}
