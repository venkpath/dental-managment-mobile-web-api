import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
export declare class AppointmentNotificationService {
    private readonly prisma;
    private readonly communicationService;
    private readonly logger;
    constructor(prisma: PrismaService, communicationService: CommunicationService);
    sendConfirmation(clinicId: string, appointmentId: string): Promise<void>;
    sendCancellation(clinicId: string, appointmentId: string): Promise<void>;
    sendReschedule(clinicId: string, appointmentId: string, oldDate: string, oldTime: string): Promise<void>;
    private getBranchMapUrl;
    private loadAppointment;
    private buildVariables;
    private sendWhatsAppTemplate;
    private formatDate;
    private formatTime;
}
