import { PrismaService } from '../../database/prisma.service.js';
import { CreateAppointmentDto, UpdateAppointmentDto, QueryAppointmentDto, QueryAvailableSlotsDto, CreateRecurringAppointmentDto } from './dto/index.js';
import { Appointment } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { AppointmentNotificationService } from './appointment-notification.service.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';
export interface AvailableSlot {
    start_time: string;
    end_time: string;
    available: boolean;
}
export declare class AppointmentService {
    private readonly prisma;
    private readonly notificationService;
    private readonly planLimit;
    private readonly logger;
    constructor(prisma: PrismaService, notificationService: AppointmentNotificationService, planLimit: PlanLimitService);
    create(clinicId: string, dto: CreateAppointmentDto): Promise<Appointment>;
    getAvailableSlots(clinicId: string, query: QueryAvailableSlotsDto): Promise<AvailableSlot[]>;
    findAll(clinicId: string, query: QueryAppointmentDto): Promise<PaginatedResult<Appointment>>;
    findOne(clinicId: string, id: string): Promise<Appointment>;
    update(clinicId: string, id: string, dto: UpdateAppointmentDto): Promise<Appointment>;
    createRecurring(clinicId: string, dto: CreateRecurringAppointmentDto): Promise<Appointment[]>;
    remove(clinicId: string, id: string): Promise<Appointment>;
    private checkTimeConflict;
    private timeToMinutes;
    private minutesToTime;
}
