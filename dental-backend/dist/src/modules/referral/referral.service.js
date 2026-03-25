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
var ReferralService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
let ReferralService = ReferralService_1 = class ReferralService {
    prisma;
    communicationService;
    logger = new common_1.Logger(ReferralService_1.name);
    constructor(prisma, communicationService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
    }
    async getOrCreateReferralCode(clinicId, patientId) {
        const existing = await this.prisma.patientReferralCode.findFirst({
            where: { clinic_id: clinicId, patient_id: patientId, is_active: true },
        });
        if (existing)
            return existing;
        const code = this.generateCode();
        return this.prisma.patientReferralCode.create({
            data: {
                clinic_id: clinicId,
                patient_id: patientId,
                code,
            },
        });
    }
    async deactivateCode(clinicId, codeId) {
        const code = await this.prisma.patientReferralCode.findFirst({
            where: { id: codeId, clinic_id: clinicId },
        });
        if (!code)
            throw new common_1.NotFoundException('Referral code not found');
        return this.prisma.patientReferralCode.update({
            where: { id: codeId },
            data: { is_active: false },
        });
    }
    async completeReferral(clinicId, dto) {
        const codeRecord = await this.prisma.patientReferralCode.findUnique({
            where: { clinic_id_code: { clinic_id: clinicId, code: dto.referral_code } },
            include: { patient: true },
        });
        if (!codeRecord || !codeRecord.is_active) {
            throw new common_1.NotFoundException('Invalid or inactive referral code');
        }
        if (codeRecord.patient_id === dto.referred_patient_id) {
            throw new common_1.ConflictException('Cannot use own referral code');
        }
        const existingReferral = await this.prisma.referral.findFirst({
            where: {
                clinic_id: clinicId,
                referred_patient_id: dto.referred_patient_id,
            },
        });
        if (existingReferral) {
            throw new common_1.ConflictException('Patient already referred');
        }
        const referral = await this.prisma.referral.create({
            data: {
                clinic_id: clinicId,
                referrer_patient_id: codeRecord.patient_id,
                referred_patient_id: dto.referred_patient_id,
                referral_code_id: codeRecord.id,
                status: 'completed',
                reward_type: 'discount_percentage',
                reward_value: 10,
                reward_status: 'pending',
            },
            include: {
                referrer: true,
                referred: true,
            },
        });
        try {
            const clinic = await this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { name: true },
            });
            await this.communicationService.sendMessage(clinicId, {
                patient_id: codeRecord.patient_id,
                channel: send_message_dto_js_1.MessageChannel.WHATSAPP,
                category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
                body: `Great news, ${codeRecord.patient.first_name}! ${referral.referred?.first_name} joined ${clinic?.name} using your referral code. Your reward is being processed! 🎉`,
                variables: {
                    patient_name: `${codeRecord.patient.first_name} ${codeRecord.patient.last_name}`,
                    referred_name: `${referral.referred?.first_name || ''} ${referral.referred?.last_name || ''}`,
                    clinic_name: clinic?.name || '',
                },
                metadata: { automation: 'referral_notification', referral_id: referral.id },
            });
        }
        catch (e) {
            this.logger.warn(`Referral notification failed: ${e.message}`);
        }
        return referral;
    }
    async creditReward(clinicId, referralId) {
        const referral = await this.prisma.referral.findFirst({
            where: { id: referralId, clinic_id: clinicId },
        });
        if (!referral)
            throw new common_1.NotFoundException('Referral not found');
        return this.prisma.referral.update({
            where: { id: referralId },
            data: { reward_status: 'credited' },
        });
    }
    async getStats(clinicId) {
        const [total, completed, rewarded, pendingRewards] = await Promise.all([
            this.prisma.referral.count({ where: { clinic_id: clinicId } }),
            this.prisma.referral.count({ where: { clinic_id: clinicId, status: 'completed' } }),
            this.prisma.referral.count({ where: { clinic_id: clinicId, reward_status: 'credited' } }),
            this.prisma.referral.count({ where: { clinic_id: clinicId, reward_status: 'pending' } }),
        ]);
        return { total, completed, rewarded, pending_rewards: pendingRewards };
    }
    async getLeaderboard(clinicId, limit = 10) {
        const leaders = await this.prisma.referral.groupBy({
            by: ['referrer_patient_id'],
            where: { clinic_id: clinicId, status: 'completed' },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: limit,
        });
        const patientIds = leaders.map((l) => l.referrer_patient_id);
        const patients = await this.prisma.patient.findMany({
            where: { id: { in: patientIds } },
            select: { id: true, first_name: true, last_name: true, phone: true },
        });
        const patientMap = new Map(patients.map((p) => [p.id, p]));
        return leaders.map((l) => ({
            patient: patientMap.get(l.referrer_patient_id),
            referral_count: l._count.id,
        }));
    }
    async getDetailedAnalytics(clinicId, startDate, endDate) {
        const where = { clinic_id: clinicId };
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate)
                where.created_at.gte = new Date(startDate);
            if (endDate)
                where.created_at.lte = new Date(endDate);
        }
        const [total, completed, rewarded, pending] = await Promise.all([
            this.prisma.referral.count({ where }),
            this.prisma.referral.count({ where: { ...where, status: 'completed' } }),
            this.prisma.referral.count({ where: { ...where, reward_status: 'credited' } }),
            this.prisma.referral.count({ where: { ...where, reward_status: 'pending' } }),
        ]);
        const conversionRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
        const topReferrers = await this.prisma.referral.groupBy({
            by: ['referrer_patient_id'],
            where: { clinic_id: clinicId, status: 'completed' },
            _count: { id: true },
            _sum: { reward_value: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });
        const referrerIds = topReferrers.map((r) => r.referrer_patient_id);
        const referrerPatients = await this.prisma.patient.findMany({
            where: { id: { in: referrerIds } },
            select: { id: true, first_name: true, last_name: true },
        });
        const referrerMap = new Map(referrerPatients.map((p) => [p.id, p]));
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        const monthlyTrend = await this.prisma.$queryRaw `
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*)::int AS referral_count,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
      FROM referrals
      WHERE clinic_id = ${clinicId}::uuid
        AND created_at >= ${sixMonthsAgo}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `;
        const referredPatientIds = await this.prisma.referral.findMany({
            where: { clinic_id: clinicId, status: 'completed', referred_patient_id: { not: null } },
            select: { referred_patient_id: true },
        });
        const rpIds = referredPatientIds
            .map((r) => r.referred_patient_id)
            .filter((id) => id !== null);
        let attributedRevenue = 0;
        if (rpIds.length > 0) {
            const result = await this.prisma.invoice.aggregate({
                where: { clinic_id: clinicId, patient_id: { in: rpIds }, status: 'paid' },
                _sum: { net_amount: true },
            });
            attributedRevenue = Number(result?._sum?.net_amount || 0);
        }
        return {
            summary: {
                total_referrals: total,
                completed,
                rewarded,
                pending_rewards: pending,
                conversion_rate: conversionRate,
                attributed_revenue: attributedRevenue,
            },
            top_referrers: topReferrers.map((r) => ({
                patient: referrerMap.get(r.referrer_patient_id),
                referral_count: r._count.id,
                total_reward_value: Number(r._sum.reward_value || 0),
            })),
            monthly_trend: monthlyTrend,
        };
    }
    async getPatientReferrals(clinicId, patientId) {
        return this.prisma.referral.findMany({
            where: { clinic_id: clinicId, referrer_patient_id: patientId },
            include: {
                referred: { select: { id: true, first_name: true, last_name: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    generateCode() {
        return (0, crypto_1.randomBytes)(4).toString('hex').toUpperCase().slice(0, 8);
    }
};
exports.ReferralService = ReferralService;
exports.ReferralService = ReferralService = ReferralService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService])
], ReferralService);
//# sourceMappingURL=referral.service.js.map