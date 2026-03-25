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
var FeedbackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const automation_service_js_1 = require("../automation/automation.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
let FeedbackService = FeedbackService_1 = class FeedbackService {
    prisma;
    communicationService;
    automationService;
    logger = new common_1.Logger(FeedbackService_1.name);
    constructor(prisma, communicationService, automationService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
        this.automationService = automationService;
    }
    async create(clinicId, dto) {
        const feedback = await this.prisma.patientFeedback.create({
            data: {
                clinic_id: clinicId,
                patient_id: dto.patient_id,
                appointment_id: dto.appointment_id,
                rating: dto.rating,
                comment: dto.comment,
            },
            include: {
                patient: { select: { id: true, first_name: true, last_name: true, email: true } },
            },
        });
        if (dto.rating >= 4) {
            await this.requestGoogleReview(clinicId, feedback);
        }
        return feedback;
    }
    async findAll(clinicId, query) {
        const { page = 1, limit = 20, patient_id, min_rating } = query;
        const skip = (page - 1) * limit;
        const where = { clinic_id: clinicId };
        if (patient_id)
            where.patient_id = patient_id;
        if (min_rating)
            where.rating = { gte: min_rating };
        const [data, total] = await Promise.all([
            this.prisma.patientFeedback.findMany({
                where,
                include: {
                    patient: { select: { id: true, first_name: true, last_name: true } },
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.patientFeedback.count({ where }),
        ]);
        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async getStats(clinicId) {
        const [total, avgResult, distribution] = await Promise.all([
            this.prisma.patientFeedback.count({ where: { clinic_id: clinicId } }),
            this.prisma.patientFeedback.aggregate({
                where: { clinic_id: clinicId },
                _avg: { rating: true },
            }),
            this.prisma.patientFeedback.groupBy({
                by: ['rating'],
                where: { clinic_id: clinicId },
                _count: { id: true },
            }),
        ]);
        const googleReviewRequests = await this.prisma.patientFeedback.count({
            where: { clinic_id: clinicId, google_review_requested: true },
        });
        return {
            total_feedback: total,
            average_rating: avgResult._avg.rating ? Number(avgResult._avg.rating.toFixed(1)) : 0,
            google_review_requests: googleReviewRequests,
            distribution: distribution.reduce((acc, d) => {
                acc[d.rating] = d._count.id;
                return acc;
            }, {}),
        };
    }
    async requestGoogleReview(clinicId, feedback) {
        try {
            const rule = await this.automationService.getRuleConfig(clinicId, 'feedback_collection');
            if (!rule?.is_enabled)
                return;
            const config = rule.config || {};
            const minRating = config.min_rating_for_google_review || 4;
            if (feedback.patient_id && minRating) {
            }
            const clinic = await this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { name: true },
            });
            const commSettings = await this.prisma.clinicCommunicationSettings.findUnique({
                where: { clinic_id: clinicId },
                select: { whatsapp_config: true },
            });
            const whatsappConfig = commSettings?.whatsapp_config || {};
            const googleReviewUrl = whatsappConfig.google_review_url;
            if (!googleReviewUrl)
                return;
            await this.prisma.patientFeedback.update({
                where: { id: feedback.id },
                data: { google_review_requested: true },
            });
            await this.communicationService.sendMessage(clinicId, {
                patient_id: feedback.patient_id,
                channel: send_message_dto_js_1.MessageChannel.WHATSAPP,
                category: send_message_dto_js_1.MessageCategory.PROMOTIONAL,
                body: `Thank you for the wonderful feedback, ${feedback.patient.first_name}! 😊 We'd love it if you could share your experience on Google: ${googleReviewUrl}`,
                variables: {
                    patient_name: `${feedback.patient.first_name} ${feedback.patient.last_name}`,
                    clinic_name: clinic?.name || '',
                    review_url: googleReviewUrl,
                },
                metadata: { automation: 'google_review_request', feedback_id: feedback.id },
            });
        }
        catch (e) {
            this.logger.warn(`Google review request failed: ${e.message}`);
        }
    }
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = FeedbackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService,
        automation_service_js_1.AutomationService])
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map