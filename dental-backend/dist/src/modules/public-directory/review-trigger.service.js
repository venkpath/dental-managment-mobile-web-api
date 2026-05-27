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
let ReviewTriggerService = ReviewTriggerService_1 = class ReviewTriggerService {
    prisma;
    communicationService;
    logger = new common_1.Logger(ReviewTriggerService_1.name);
    constructor(prisma, communicationService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
    }
    async triggerPostAppointmentReview(clinicId, appointmentId, patientId, dentistId) {
        try {
            const clinic = await this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { listed_in_directory: true, name: true },
            });
            if (!clinic?.listed_in_directory)
                return;
            const existing = await this.prisma.clinicDirectoryReview.findFirst({
                where: { appointment_id: appointmentId },
            });
            if (existing)
                return;
            const token = (0, crypto_1.randomBytes)(32).toString('hex');
            await this.prisma.clinicDirectoryReview.create({
                data: {
                    clinic_id: clinicId,
                    doctor_id: dentistId || null,
                    appointment_id: appointmentId,
                    token,
                    reviewer_name: '',
                    overall_rating: 0,
                },
            });
            const reviewUrl = `${APP_BASE_URL}/review/${token}`;
            const patient = await this.prisma.patient.findUnique({
                where: { id: patientId },
                select: { first_name: true, id: true },
            });
            if (!patient)
                return;
            await this.communicationService.sendMessage(clinicId, {
                patient_id: patientId,
                channel: send_message_dto_js_1.MessageChannel.WHATSAPP,
                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                body: `Hi ${patient.first_name}! 😊 Thank you for visiting *${clinic.name}*. We hope you had a great experience!\n\nShare your feedback (takes 30 seconds): ${reviewUrl}\n\nYour review helps other patients find us. 🙏`,
                variables: {
                    patient_name: patient.first_name,
                    clinic_name: clinic.name,
                    review_url: reviewUrl,
                },
                metadata: { automation: 'post_appointment_review', appointment_id: appointmentId },
            });
            this.logger.log(`Review request sent for appointment ${appointmentId}`);
        }
        catch (e) {
            this.logger.warn(`Post-appointment review trigger failed: ${e.message}`);
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