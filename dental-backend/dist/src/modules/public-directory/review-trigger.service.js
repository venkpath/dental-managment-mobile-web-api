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
var ReviewTriggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewTriggerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const crypto_1 = require("crypto");
const APP_BASE_URL = process.env['APP_BASE_URL'] || 'https://smartdentaldesk.com';
const DEDUP_WINDOW_HOURS = 48;
let ReviewTriggerService = ReviewTriggerService_1 = class ReviewTriggerService {
    prisma;
    communicationService;
    logger = new common_1.Logger(ReviewTriggerService_1.name);
    constructor(prisma, communicationService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
    }
    async triggerPostAppointmentReview(clinicId, appointmentId, patientId, dentistId) {
        await this.sendReviewRequest({
            clinicId,
            patientId,
            doctorId: dentistId || null,
            appointmentId,
            source: 'appointment',
        });
    }
    async triggerConsultationReview(clinicId, patientId, dentistId) {
        await this.sendReviewRequest({
            clinicId,
            patientId,
            doctorId: dentistId || null,
            appointmentId: null,
            source: 'consultation',
        });
    }
    async triggerInvoiceReview(clinicId, patientId, dentistId) {
        await this.sendReviewRequest({
            clinicId,
            patientId,
            doctorId: dentistId ?? null,
            appointmentId: null,
            source: 'invoice',
        });
    }
    async sendReviewRequest(opts) {
        try {
            const { clinicId, patientId, doctorId, appointmentId, source } = opts;
            const clinic = await this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { name: true, phone: true },
            });
            if (!clinic)
                return;
            const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);
            const existing = await this.prisma.clinicDirectoryReview.findFirst({
                where: {
                    clinic_id: clinicId,
                    patient_id: patientId,
                    created_at: { gte: cutoff },
                },
                select: { id: true },
            });
            if (existing) {
                this.logger.log(`Review request skipped for patient ${patientId} — already sent within ${DEDUP_WINDOW_HOURS}h`);
                return;
            }
            if (appointmentId) {
                const byAppt = await this.prisma.clinicDirectoryReview.findFirst({
                    where: { appointment_id: appointmentId },
                    select: { id: true },
                });
                if (byAppt)
                    return;
            }
            const patient = await this.prisma.patient.findUnique({
                where: { id: patientId },
                select: { first_name: true, id: true },
            });
            if (!patient)
                return;
            const token = (0, crypto_1.randomBytes)(32).toString('hex');
            await this.prisma.clinicDirectoryReview.create({
                data: {
                    clinic_id: clinicId,
                    patient_id: patientId,
                    doctor_id: doctorId,
                    appointment_id: appointmentId,
                    source,
                    token,
                    reviewer_name: '',
                    overall_rating: 0,
                    approval_status: 'pending',
                    is_visible: false,
                },
            });
            const reviewUrl = `${APP_BASE_URL}/review/${token}`;
            const clinicPhone = clinic.phone ?? '';
            const template = await this.prisma.messageTemplate.findFirst({
                where: {
                    template_name: 'review_request_post_visit',
                    channel: 'whatsapp',
                    is_active: true,
                    whatsapp_template_status: 'approved',
                    OR: [{ clinic_id: clinicId }, { clinic_id: null }],
                },
                orderBy: { clinic_id: 'desc' },
                select: { id: true },
            }) ?? await this.prisma.messageTemplate.findFirst({
                where: {
                    template_name: 'review_request_post_visit',
                    channel: 'whatsapp',
                    is_active: true,
                    OR: [{ clinic_id: clinicId }, { clinic_id: null }],
                },
                orderBy: { clinic_id: 'desc' },
                select: { id: true },
            });
            if (!template) {
                this.logger.warn(`WhatsApp template "review_request_post_visit" not found or inactive for clinic ${clinicId}. ` +
                    `Go to Communication → WhatsApp Templates, ensure the template exists with that exact name and status is Approved.`);
                return;
            }
            await this.communicationService.sendMessage(clinicId, {
                patient_id: patientId,
                channel: send_message_dto_js_1.MessageChannel.WHATSAPP,
                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                template_id: template.id,
                variables: {
                    patient_name: patient.first_name,
                    clinic_name: clinic.name,
                    review_url: reviewUrl,
                    clinic_phone: clinicPhone,
                    '1': patient.first_name,
                    '2': clinic.name,
                    '3': reviewUrl,
                    '4': clinicPhone,
                },
                metadata: { automation: 'post_visit_review', source, appointment_id: appointmentId ?? undefined },
            });
            this.logger.log(`Review request sent — patient ${patientId}, source: ${source}`);
        }
        catch (e) {
            this.logger.warn(`Review trigger failed: ${e.message}`);
        }
    }
};
exports.ReviewTriggerService = ReviewTriggerService;
exports.ReviewTriggerService = ReviewTriggerService = ReviewTriggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService])
], ReviewTriggerService);
//# sourceMappingURL=review-trigger.service.js.map